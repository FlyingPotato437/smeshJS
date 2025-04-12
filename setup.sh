#!/bin/bash

# Air Quality Analyzer Setup Script
echo "==== Air Quality Analyzer Setup ===="
echo ""

# Check for required commands
echo "Checking prerequisites..."
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Please install Node.js v16 or newer."
    exit 1
fi

if ! command -v npm &> /dev/null
then
    echo "npm is not installed. Please install npm."
    exit 1
fi

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOL
# Database
DATABASE_URL="postgresql://srikanthsamy1:new_password@localhost:5432/air_quality_db"

# OpenAI
OPENAI_API_KEY=your-openai-key-here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=random-secret-key-here

# Gemini (optional)
GEMINI_API_KEY=your-gemini-key-here
EOL
    echo "Created .env.local file with default settings."
    echo "IMPORTANT: Please edit .env.local to set your actual API keys."
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if data directory exists and has CSV file
echo "Checking for data file..."
mkdir -p public/data

if [ ! -f public/data/Dataset_with_Location_Data.csv ]; then
    # Look for the file in the parent directory
    if [ -f ../Dataset_with_Location_Data.csv ]; then
        echo "Copying CSV file from parent directory..."
        cp ../Dataset_with_Location_Data.csv public/data/
    else
        echo "WARNING: Could not find Dataset_with_Location_Data.csv"
        echo "Please place your CSV file in the public/data directory."
    fi
else
    echo "Data file already exists."
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Ask if user wants to run migrations
echo ""
read -p "Do you want to run database migrations? (y/n): " run_migrations
if [[ $run_migrations == "y" || $run_migrations == "Y" ]]; then
    echo "Running database migrations..."
    npx prisma migrate deploy
    
    # Ask if user wants to load data
    echo ""
    read -p "Do you want to load data from the CSV file? (y/n): " load_data
    if [[ $load_data == "y" || $load_data == "Y" ]]; then
        echo "Loading data from CSV file..."
        node scripts/init-db.js
    fi
fi

echo ""
echo "==== Setup Complete ===="
echo "To start the development server, run: npm run dev"
echo "Then visit: http://localhost:3000"