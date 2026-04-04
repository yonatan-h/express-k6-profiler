console.log('here');

import { AsyncLocalStorage } from 'async_hooks';
const storage = new AsyncLocalStorage();

function one() {
  console.log('🚀 ~ one ~ one:');
  storage.enterWith({ number: 2 });
  setTimeout(two, 1000);
  storage.enterWith({ number: 3 });
  setTimeout(three, 500);
  storage.enterWith({ number: 4 });
  four();
}

function two() {
  console.log('TWO:', storage.getStore());
}

function three() {
  console.log('Three:', storage.getStore());
}

function four() {
  console.log('Four:', storage.getStore());
}

setTimeout(() => {
  console.log('---<>---');
}, 5000);
one();
