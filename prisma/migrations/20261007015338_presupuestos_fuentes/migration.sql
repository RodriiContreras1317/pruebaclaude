-- CreateTable
CREATE TABLE "FuentePresupuesto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "datos" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FuentePresupuesto_tipo_createdAt_idx" ON "FuentePresupuesto"("tipo", "createdAt");
