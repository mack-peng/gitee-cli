import * as readline from 'readline';

export function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden) {
      process.stdout.write(question);
      let value = '';
      const stdin = process.stdin;
      stdin.setRawMode?.(true);
      stdin.resume();
      stdin.setEncoding('utf-8');
      stdin.on('data', (char: string) => {
        if (char === '\n' || char === '\r' || char === '\u0003') {
          stdin.setRawMode?.(false);
          stdin.pause();
          process.stdout.write('\n');
          rl.close();
          resolve(value);
        } else if (char === '\u007F') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          value += char;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export function promptConfirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}
