import app from './src/app';
import { spawn } from 'child_process';

const PORT = 3010;
app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}`);
  console.log(`View profiler at http://localhost:${PORT}/api/__profile`);

  const child = spawn('k6', ['run', 'example/k6-test.js'], {
    // stdio: 'inherit',
    shell: true,
  });

  child.on('exit', async () => {
    console.log('k6 exited');
    console.log('RUNNING AS ' + (process.env.__AS_DEV === 'true' ? 'DEV' : 'PROD'));
    console.log(
      'Res is:',
      // await fetch(`http://localhost:${PORT}/api/__profile/api/all`).then((res) => res.json()),
    );
    console.log('View', `http://localhost:${PORT}/api/__profile`);
  });
});
