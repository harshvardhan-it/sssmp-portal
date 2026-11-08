import readline from 'node:readline';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { User } from '../models';
import { bootstrapSuperAdmin } from '../services/bootstrap.service';


function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    if (!hidden) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    // Password input: do not create a competing readline interface.
    const stdin = process.stdin;

    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      const rl = readline.createInterface({
        input: stdin,
        output: process.stdout,
      });

      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    process.stdout.write(question);

    let password = '';

    const onData = (chunk: Buffer) => {
      const value = chunk.toString();

      for (const char of value) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password.trim());
        } else if (char === '\u0003') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          resolve('');
        } else if (char === '\u007f' || char === '\b') {
          password = password.slice(0, -1);
        } else {
          password += char;
        }
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}


export async function runBootstrap(): Promise<void> {
  await connectDatabase();
  try {
    await User.init();
    const email = process.env.BOOTSTRAP_EMAIL?.trim() || await ask('Email (optional): ');
    const mobile = process.env.BOOTSTRAP_MOBILE?.trim() || await ask('Mobile (optional): ');
    const password =
      process.env.BOOTSTRAP_PASSWORD ||
      await ask('Password (input is hidden): ', true);
    const result = await bootstrapSuperAdmin({
      email: email || undefined,
      mobile: mobile || undefined,
      password,
    });
    console.log(`SUPER_ADMIN bootstrapped: ${result.id}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  void runBootstrap().catch((error: unknown) => {
    console.error('SUPER_ADMIN bootstrap failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}
