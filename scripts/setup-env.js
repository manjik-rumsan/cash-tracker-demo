/**
 * Script to load environment variables from .env file for Hardhat configuration
 * Run this script before running Hardhat commands to ensure environment variables are loaded
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to .env file
const envPath = path.resolve(__dirname, '../.env');

// Function to parse .env file
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: .env file not found at ${filePath}`);
    console.log('Creating a sample .env file...');
    fs.writeFileSync(filePath, 'DEPLOYER_KEY=your_private_key_here\n');
    return {};
  }

  const envContent = fs.readFileSync(filePath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;

    // Split by the first '=' character
    const splitIndex = line.indexOf('=');
    if (splitIndex !== -1) {
      const key = line.substring(0, splitIndex).trim();
      const value = line.substring(splitIndex + 1).trim();
      envVars[key] = value;
    }
  });

  return envVars;
}

// Main function to setup environment variables
function setupEnv() {
  try {
    console.log('Loading environment variables from .env file...');
    const envVars = parseEnvFile(envPath);

    // Set each environment variable in Hardhat using the vars command
    Object.entries(envVars).forEach(([key, value]) => {
      if (key && value) {
        try {
          console.log(`Setting ${key}...`);
          execSync(`npx hardhat vars set ${key}="${value}"`, { stdio: 'inherit' });
        } catch (error) {
          console.error(`Failed to set ${key}: ${error.message}`);
        }
      }
    });

    console.log('Environment variables successfully loaded!');
    console.log('You can now run Hardhat commands with these variables.');
  } catch (error) {
    console.error('Error setting up environment:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupEnv();