const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'STUDENT' } })
  const course = await prisma.course.findFirst()
  
  if (!user || !course) {
    console.error('Teacher or Student or Course not found in database. Run npx prisma db seed first.')
    return
  }

  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      courseId: course.id,
      type: 'COURSE',
      amount: course.price,
      status: 'PENDING',
      paymentMethod: 'yoomoney'
    }
  })

  console.log('Test Purchase created:')
  console.log('ID:', purchase.id)
  console.log('User Email:', user.email)
  console.log('Course Name:', course.name)
  console.log('Expected Amount:', purchase.amount)
}

main().catch(console.error).finally(() => prisma.$disconnect())
