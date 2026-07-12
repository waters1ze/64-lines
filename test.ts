import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const userId = 'cmrgthxs10002l404gxcq3985'
  
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    include: { course: true, module: true }
  })
  
  for (const p of purchases) {
    console.log('Purchase id:', p.id)
    console.log('  status:', p.status)
    console.log('  paymentMethod:', p.paymentMethod)
    console.log('  courseId:', p.courseId)
    console.log('  moduleId:', p.moduleId)
    console.log('  course:', p.course ? { id: p.course.id, name: p.course.name } : null)
    console.log('  module:', p.module ? { id: (p.module as any).id, title: (p.module as any).title } : null)
  }
  
  const accesses = await prisma.moduleAccess.findMany({ where: { userId } })
  console.log('Module accesses:', accesses)
  
  const modules = await prisma.module.findMany()
  console.log('Total modules in DB:', modules.length, modules.map(m => ({ id: m.id, title: m.title })))
  
  const courses = await prisma.course.findMany()
  console.log('Total courses in DB:', courses.length, courses.map(c => ({ id: c.id, name: c.name })))
}
main().catch(console.error).finally(() => prisma.$disconnect())
