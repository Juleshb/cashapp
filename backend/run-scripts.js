#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Available scripts with descriptions
const SCRIPTS = {
  'create-admin': {
    file: 'create-admin.js',
    description: 'Create a default admin user with credentials',
    params: []
  },
  
  'seed-tasks': {
    file: 'seed-tasks.js',
    description: 'Seed default tasks in the system',
    params: []
  },
  'setup-tasks': {
    file: 'setup-tasks.js',
    description: 'Setup task system',
    params: []
  },
  'update-vip-bicycles': {
    file: 'update-vip-bicycles.js',
    description: 'Update VIP bicycle information',
    params: []
  },
  'init-network-fees': {
    file: 'init-network-fees.js',
    description: 'Initialize network fees',
    params: []
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function displayScripts() {
  console.log('\n📋 Available Scripts:\n');
  Object.entries(SCRIPTS).forEach(([key, script], index) => {
    console.log(`${index + 1}. ${key.padEnd(25)} - ${script.description}`);
  });
  console.log(`0. Exit\n`);
}

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'scripts', SCRIPTS[scriptName].file);
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script file not found: ${scriptPath}`));
      return;
    }

    console.log(`\n🚀 Running: ${scriptName}`);
    console.log(`📄 File: ${SCRIPTS[scriptName].file}`);
    console.log(`📝 Description: ${SCRIPTS[scriptName].description}`);
    console.log('─'.repeat(50));

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('close', (code) => {
      console.log('─'.repeat(50));
      if (code === 0) {
        console.log(`✅ Script completed successfully!\n`);
        resolve();
      } else {
        console.log(`❌ Script failed with exit code ${code}\n`);
        reject(new Error(`Script failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.log('─'.repeat(50));
      console.log(`❌ Error running script: ${error.message}\n`);
      reject(error);
    });
  });
}

async function main() {
  console.log('🔧 B-Bike - Script Runner');
  console.log('=====================================\n');

  // Check if script name is provided as command line argument
  const scriptName = process.argv[2];
  
  if (scriptName) {
    if (scriptName === 'list' || scriptName === '--list' || scriptName === '-l') {
      displayScripts();
      rl.close();
      return;
    }

    if (SCRIPTS[scriptName]) {
      try {
        await runScript(scriptName);
      } catch (error) {
        console.error(`❌ Failed to run script: ${error.message}`);
        process.exit(1);
      }
      rl.close();
      return;
    } else {
      console.log(`❌ Unknown script: ${scriptName}`);
      console.log('Use "list" to see available scripts\n');
      rl.close();
      return;
    }
  }

  // Interactive mode
  while (true) {
    displayScripts();
    
    const choice = await question('Select a script to run (0-11): ');
    
    if (choice === '0' || choice.toLowerCase() === 'exit') {
      console.log('👋 Goodbye!');
      break;
    }

    const scriptKeys = Object.keys(SCRIPTS);
    const scriptIndex = parseInt(choice) - 1;
    
    if (scriptIndex >= 0 && scriptIndex < scriptKeys.length) {
      const selectedScript = scriptKeys[scriptIndex];
      
      const confirm = await question(`\nRun "${selectedScript}"? (y/N): `);
      
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        try {
          await runScript(selectedScript);
        } catch (error) {
          console.error(`❌ Script failed: ${error.message}`);
        }
      } else {
        console.log('❌ Cancelled\n');
      }
    } else {
      console.log('❌ Invalid choice. Please select a number between 0-11.\n');
    }
  }

  rl.close();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
