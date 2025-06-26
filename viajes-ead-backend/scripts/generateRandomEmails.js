import fs from 'fs';
import path from 'path';

// Function to generate a random email
const generateRandomEmail = () => {
    // List of common domains
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'];
    
    // Generate random username (5-10 characters)
    const usernameLength = Math.floor(Math.random() * 6) + 5; // 5-10 characters
    let username = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    
    for (let i = 0; i < usernameLength; i++) {
        username += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Randomly select a domain
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${username}@${domain}`;
};

// Generate 250 random emails
const generateRandomEmails = (count) => {
    const emails = [];
    
    for (let i = 0; i < count; i++) {
        emails.push(generateRandomEmail());
    }
    
    return emails;
};

// Save emails to CSV file
const saveEmailsToCSV = (emails, filePath) => {
    const csvContent = emails.join(',');
    
    fs.writeFileSync(filePath, csvContent, 'utf8');
    console.log(`Successfully generated ${emails.length} random emails and saved to ${filePath}`);
};

// Main function
const main = () => {
    const emailCount = 250;
    const outputPath = path.join(process.cwd(), 'random_emails.csv');
    
    const emails = generateRandomEmails(emailCount);
    saveEmailsToCSV(emails, outputPath);
};

// Execute the script
main();