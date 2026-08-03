const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'opheophe';
const REPO_NAME = 'tampermonkey';
const BRANCH = 'main';

// 1. Scan for all .js files in the root directory (excluding hidden files & scripts folder)
const files = fs.readdirSync('.')
    .filter(file => file.endsWith('.user.js') && !file.startsWith('.'))
    .sort();

let markdownTable = '\n| Script Name | Description | Install Link |\n| :--- | :--- | :--- |\n';

files.forEach(file => {
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${file}`;
    const filePath = path.join('.', file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract metadata tags using regular expressions
    const nameMatch = content.match(/\/\/\s*@name\s+(.+)/);
    const descMatch = content.match(/\/\/\s*@description\s+(.+)/);

    const scriptName = nameMatch ? nameMatch[1].trim() : file;
    const description = descMatch ? descMatch[1].trim() : 'No description provided.';

    // Build table row
    const badge = `<img src="https://img.shields.io/badge/Install-Tampermonkey-008080?style=for-the-badge&logo=tampermonkey" height="26">`;
    markdownTable += `| **${scriptName}** | ${description} | [${badge}](${rawUrl}) |\n`;
});

// 2. Insert table into README between marker comments
let readme = fs.readFileSync('README.md', 'utf8');
const regex = /<!-- SCRIPTS_START -->[\s\S]*<!-- SCRIPTS_END -->/;
const updatedReadme = readme.replace(
    regex,
    `<!-- SCRIPTS_START -->\n${markdownTable}\n<!-- SCRIPTS_END -->`
);

fs.writeFileSync('README.md', updatedReadme);
console.log('Successfully updated README.md with descriptions!');
