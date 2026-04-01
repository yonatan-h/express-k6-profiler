# express-k6-profiler

Identify slow routes and middleware in Express apps during k6 load tests.

k6 tells you *that* your API is slow.  
This tells you *why*.

## Example output

GET /api/orders - 420ms

  dbQuery: 300ms  <-- bottleneck  
  auth: 50ms  
  validation: 30ms  

## Usage

```js
import express from "express";
app.use(profiler());

