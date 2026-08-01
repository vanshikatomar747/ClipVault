const mongoose = require('mongoose');

const notebookSchema = new mongoose.Schema({
  userId: String,
  name: String,
  isDefault: Boolean
}, { collection: 'notebooks' });

const NotebookModel = mongoose.model('Notebook', notebookSchema);

const userSchema = new mongoose.Schema({
  email: String,
  name: String
}, { collection: 'users' });

const UserModel = mongoose.model('User', userSchema);

const mongoURI = 'mongodb://vanshikat747_db_user:fxuQDoTj9thvDu3n@ac-ykmj79p-shard-00-00.eoe7uy4.mongodb.net:27017,ac-ykmj79p-shard-00-01.eoe7uy4.mongodb.net:27017,ac-ykmj79p-shard-00-02.eoe7uy4.mongodb.net:27017/clipvault?ssl=true&replicaSet=atlas-7zkpar-shard-0&authSource=admin&retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(mongoURI);
  console.log('Connected to MongoDB Atlas');
  
  const user = await UserModel.findOne({ email: 'vanshikat747@gmail.com' });
  if (!user) {
    console.log('User vanshikat747@gmail.com NOT found in Atlas');
    await mongoose.disconnect();
    return;
  }
  console.log('User found in Atlas:', user._id);

  const notebooks = await NotebookModel.find({ userId: user._id.toString() });
  console.log('Notebooks found for user:', notebooks.length);
  notebooks.forEach(n => console.log(`- ${n.name} (Default: ${n.isDefault})`));

  const clipboardItemSchema = new mongoose.Schema({
    userId: String,
    text: String,
    createdAt: Date
  }, { collection: 'clipboarditems' });
  const ClipboardItemModel = mongoose.model('ClipboardItem', clipboardItemSchema);

  const items = await ClipboardItemModel.find({ userId: user._id.toString() }).sort({ createdAt: -1 });
  console.log('Clipboard items found for user:', items.length);
  items.forEach(i => console.log(`- [${i.createdAt?.toISOString()}] ${i.text.substring(0, 50)}...`));
  
  await mongoose.disconnect();
}

main().catch(console.error);
