-- CreateTable
CREATE TABLE "air_quality" (
  "id" SERIAL NOT NULL,
  "datetime" TIMESTAMP(3) NOT NULL,
  "from_node" TEXT,
  "pm10Standard" DOUBLE PRECISION,
  "pm25Standard" DOUBLE PRECISION,
  "pm100Standard" DOUBLE PRECISION,
  "pm10Environmental" DOUBLE PRECISION,
  "pm25Environmental" DOUBLE PRECISION,
  "pm100Environmental" DOUBLE PRECISION,
  "rxSnr" DOUBLE PRECISION,
  "hopLimit" DOUBLE PRECISION,
  "rxRssi" DOUBLE PRECISION,
  "hopStart" DOUBLE PRECISION,
  "from_short_name" TEXT,
  "temperature" DOUBLE PRECISION,
  "relativeHumidity" DOUBLE PRECISION,
  "barometricPressure" DOUBLE PRECISION,
  "gasResistance" DOUBLE PRECISION,
  "iaq" DOUBLE PRECISION,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "elevation" TEXT,

  CONSTRAINT "air_quality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queries" (
  "id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "sql_query" TEXT,
  "result_summary" JSONB,
  "analysis" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "air_quality_datetime_idx" ON "air_quality"("datetime");