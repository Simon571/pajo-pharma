const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  console.log('🔍 Vérification des utilisateurs...');
  
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('file:')) {
    console.log('❌ Utilisez DATABASE_URL PostgreSQL');
    return;
  }

  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany();
    console.log(`👥 ${users.length} utilisateurs trouvés:`);
    
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Actif: ${user.isActive}`);
      console.log(`    Mot de passe hashé: ${user.password.substring(0, 20)}...`);
    });

    // Test spécifique pour admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@pajourani.com' }
    });
    
    if (admin) {
      console.log('✅ Admin trouvé');
    } else {
      console.log('❌ Admin non trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();