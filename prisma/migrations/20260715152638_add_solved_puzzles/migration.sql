-- CreateTable
CREATE TABLE "SolvedPuzzle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolvedPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolvedPuzzle_userId_puzzleId_key" ON "SolvedPuzzle"("userId", "puzzleId");

-- AddForeignKey
ALTER TABLE "SolvedPuzzle" ADD CONSTRAINT "SolvedPuzzle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
