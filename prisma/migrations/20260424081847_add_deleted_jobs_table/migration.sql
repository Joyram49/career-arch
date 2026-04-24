-- CreateTable
CREATE TABLE "deleted_jobs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deleted_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deleted_jobs_jobId_key" ON "deleted_jobs"("jobId");

-- CreateIndex
CREATE INDEX "deleted_jobs_deleteAt_idx" ON "deleted_jobs"("deleteAt");

-- CreateIndex
CREATE INDEX "deleted_jobs_orgId_idx" ON "deleted_jobs"("orgId");

-- AddForeignKey
ALTER TABLE "deleted_jobs" ADD CONSTRAINT "deleted_jobs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
