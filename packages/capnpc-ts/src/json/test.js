#!/usr/bin/env node

/**
 * @author jdiaz5513
 */

const fs = require('fs');
const path = require('path');

const {generate} = require('../../../lib/gen/json');

const filePath = process.argv[2];

const rawJSON = fs.readFileSync(filePath || path.join(__dirname, 'schema.capnp.json'), 'utf-8');

generate(rawJSON);
