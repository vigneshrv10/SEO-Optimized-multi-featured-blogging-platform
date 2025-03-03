const mongoose = require('mongoose');
const PosT = require('./src/postdb');

async function deletePosts() {
  try {
    await mongoose.connect('mongodb+srv://arjuncvinod:gdozFKJP7i12I87s@cluster0.yjxy0xp.mongodb.net/todoListDB');
    const result = await PosT.deleteMany({
      author: { $in: ['algol', 'admin', 'manoj', 'daniel'] }
    });
    console.log(`Deleted ${result.deletedCount} posts`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deletePosts(); 