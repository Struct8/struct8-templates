"""
Converte a serie temporal de COVID-19 da Johns Hopkins de CSV para Parquet.

ENTRADA (camada bronze): os dois CSV publicados pela JHU, no formato LARGO -- uma
linha por regiao e UMA COLUNA POR DIA, com cabecalho no formato M/D/AA. Sao mais de
mil colunas de data, e nenhuma ferramenta de consulta trabalha bem assim.

SAIDA (camada silver): Parquet no formato LONGO -- uma linha por regiao e por dia,
com `confirmed` e `deaths` lado a lado, particionado por `report_date`. A particao e
o que faz o Athena ler so os dias consultados em vez do conjunto inteiro.

Argumentos do job (definidos em `default_arguments`, no diagrama):
  --BRONZE_PATH   s3://<bucket-bronze>/covid19
  --SILVER_PATH   s3://<bucket-silver>/covid19
"""

import sys

from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql import functions as F

ARGS = getResolvedOptions(sys.argv, ["JOB_NAME", "BRONZE_PATH", "SILVER_PATH"])

sc = SparkContext()
glue = GlueContext(sc)
spark = glue.spark_session
job = Job(glue)
job.init(ARGS["JOB_NAME"], ARGS)

BRONZE = ARGS["BRONZE_PATH"].rstrip("/")
SILVER = ARGS["SILVER_PATH"].rstrip("/")

# As quatro primeiras colunas identificam a regiao; todo o resto e data.
CHAVES = ["Province/State", "Country/Region", "Lat", "Long"]


def ler_longo(caminho, nome_da_medida):
    """Le um CSV largo da JHU e devolve uma linha por regiao e por dia."""
    largo = spark.read.option("header", "true").option("inferSchema", "true").csv(caminho)

    colunas_de_data = [c for c in largo.columns if c not in CHAVES]
    if not colunas_de_data:
        raise ValueError("Nenhuma coluna de data em %s -- o cabecalho mudou?" % caminho)

    # `stack` desmonta N colunas em N linhas de (nome, valor). O nome da coluna e
    # escapado com crase porque contem barras (1/22/20).
    pares = ", ".join("'%s', `%s`" % (c, c) for c in colunas_de_data)
    expressao = "stack(%d, %s) as (data_bruta, valor)" % (len(colunas_de_data), pares)

    return (
        largo.select(
            F.col("Province/State").alias("province"),
            F.col("Country/Region").alias("country"),
            F.col("Lat").cast("double").alias("lat"),
            F.col("Long").cast("double").alias("lon"),
            F.expr(expressao),
        )
        # O cabecalho da JHU usa M/D/AA com ano de dois digitos.
        .withColumn("report_date", F.date_format(F.to_date("data_bruta", "M/d/yy"), "yyyy-MM-dd"))
        .withColumn(nome_da_medida, F.col("valor").cast("long"))
        .drop("data_bruta", "valor")
    )


confirmados = ler_longo("%s/confirmed/" % BRONZE, "confirmed")
obitos = ler_longo("%s/deaths/" % BRONZE, "deaths")

# As duas series tem a MESMA grade de regiao e dia, entao o join e por igualdade nas
# quatro chaves mais a data. `province` e nulo em pais sem subdivisao, e nulo nunca
# casa com nulo num join comum -- por isso `eqNullSafe` nessa coluna.
condicao = [
    confirmados["country"].eqNullSafe(obitos["country"]),
    confirmados["province"].eqNullSafe(obitos["province"]),
    confirmados["report_date"] == obitos["report_date"],
]

serie = (
    confirmados.join(obitos.select("country", "province", "report_date", "deaths"), condicao, "left")
    .select(
        confirmados["country"],
        confirmados["province"],
        confirmados["lat"],
        confirmados["lon"],
        confirmados["report_date"],
        confirmados["confirmed"],
        obitos["deaths"],
    )
    .where(F.col("report_date").isNotNull())
)

(
    serie.repartition("report_date")
    .write.mode("overwrite")
    .partitionBy("report_date")
    .parquet("%s/" % SILVER)
)

job.commit()
