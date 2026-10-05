import { argon2id, hash } from "argon2";

const password = process.argv[2];
if (!password) {
  console.error('Pemakaian: npm run hash -- "<password>"');
  process.exit(1);
}

const hashed = await hash(password, { type: argon2id });
console.log(`'${hashed}'`);
