// scripts/update-passwords.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Actualizando contraseñas...\n')

  const password = 'admin123'
  const hashedPassword = await bcrypt.hash(password, 10)

  console.log('Hash generado:', hashedPassword, '\n')

  const usuarios = ['admin', 'jperez', 'mlopez', 'cruiz', 'atorres']

  for (const usuario of usuarios) {
    await prisma.usuario.update({
      where: { usuario },
      data: { clave: hashedPassword }
    })
    console.log(`✅ Contraseña actualizada para: ${usuario}`)
  }

  console.log('\n✅ Todas las contraseñas actualizadas!')
  console.log('📋 Contraseña: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })