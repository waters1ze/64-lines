const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    // Get database size
    const dbSizeResult = await prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`
    const sizeInBytes = Number(dbSizeResult[0].size)
    const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2)

    console.log(`Current database size: ${sizeInMB} MB`)
    
    // In Neon Free Tier, the limit is usually 500 MB.
    console.log(`If you are on Neon Free Tier, limit is 500 MB. You have used ${((sizeInMB / 500) * 100).toFixed(2)}%`)
    
    const tableSizes = await prisma.$queryRaw`
      SELECT relname as table_name,
             pg_total_relation_size(relid) as size_bytes
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 10;
    `
    console.log('\nTop 10 largest tables:')
    tableSizes.forEach(t => {
      console.log(`- ${t.table_name}: ${(Number(t.size_bytes) / 1024 / 1024).toFixed(2)} MB`)
    })

  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
