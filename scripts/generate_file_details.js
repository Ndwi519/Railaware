const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');
const CLIENT_DIR = path.join(ROOT, 'client', 'src');
const OUTPUT_FILE = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\407714cd-5906-4d2e-bd78-a56e2e7b0d27\\detailed_project_summary.md';

const EXCLUDE_DIRS = ['node_modules', 'coverage', 'tests', '__tests__', 'fixtures'];
const ALLOWED_EXT = ['.js', '.jsx', '.cjs', '.mjs', '.ts', '.tsx'];

function shouldProcess(filePath) {
    if (EXCLUDE_DIRS.some(dir => filePath.includes(path.sep + dir + path.sep) || filePath.includes(path.sep + dir))) {
        return false;
    }
    if (!ALLOWED_EXT.includes(path.extname(filePath))) {
        return false;
    }
    if (filePath.endsWith('.test.js') || filePath.endsWith('.test.jsx')) {
        return false;
    }
    return true;
}

async function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const items = await promisify(fs.readdir)(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            if (!EXCLUDE_DIRS.includes(item.name)) {
                await getFiles(fullPath, files);
            }
        } else if (shouldProcess(fullPath)) {
            files.push(fullPath);
        }
    }
    return files;
}

function parseFileContext(content) {
    const deps = [];
    const exportsList = [];
    let purpose = "";
    
    // Extract top-level block comment if present
    const blockMatch = content.match(/^\s*\/\*\*([\s\S]*?)\*\//);
    if (blockMatch) {
        purpose = blockMatch[1].split('\n')
            .map(line => line.replace(/^\s*\*\s?/, '').trim())
            .filter(Boolean)
            .join(' ');
    } else {
        // try to find first line comments
        const lineMatch = content.match(/^(?:\s*\/\/.*\n)+/);
        if (lineMatch) {
            purpose = lineMatch[0].split('\n')
                .map(line => line.replace(/^\s*\/\/\s?/, '').trim())
                .filter(Boolean)
                .join(' ');
        }
    }

    // Extract requires and imports
    const requireRegex = /(?:const|let|var)\s+(?:\{[^}]+\}|[a-zA-Z0-9_$]+)\s*=\s*require\((['"])(.*?)\1\)/g;
    const importRegex = /import\s+.*?\s+from\s+(['"])(.*?)\1/g;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
        if (!deps.includes(match[2])) deps.push(match[2]);
    }
    while ((match = importRegex.exec(content)) !== null) {
        if (!deps.includes(match[2])) deps.push(match[2]);
    }

    // Extract exports (approximate via regex)
    const exportCommonJs = /module\.exports\s*=\s*(?:\{([^}]+)\}|([a-zA-Z0-9_$]+))/g;
    const exportES6 = /export\s+(const|class|function|let)\s+([a-zA-Z0-9_$]+)/g;
    const exportDefault = /export\s+default\s+([a-zA-Z0-9_$]+)/g;
    
    while ((match = exportCommonJs.exec(content)) !== null) {
        if (match[1]) {
            match[1].split(',').forEach(e => {
                const ex = e.trim().split(':')[0].trim();
                if (ex && !exportsList.includes(ex)) exportsList.push(ex);
            });
        } else if (match[2]) {
             if (!exportsList.includes(match[2])) exportsList.push(match[2]);
        }
    }
    
    while ((match = exportES6.exec(content)) !== null) {
         if (!exportsList.includes(match[2])) exportsList.push(match[2]);
    }
    
    while ((match = exportDefault.exec(content)) !== null) {
         if (!exportsList.includes(`default (${match[1]})`)) exportsList.push(`default (${match[1]})`);
    }

    // Basic logic detection
    let logicSummary = [];
    if (content.includes('class ')) logicSummary.push('Defines classes.');
    if (content.includes('function ')) logicSummary.push('Defines functions.');
    if (content.includes('express.Router()')) logicSummary.push('Configures Express routes.');
    if (content.includes('React.') || content.includes('useEffect') || content.includes('useState')) logicSummary.push('React component/hook.');
    if (content.includes('Object.freeze')) logicSummary.push('Enforces immutability via Object.freeze.');
    if (content.includes('throw new ')) logicSummary.push('Contains error throwing / validation checks.');
    if (content.includes('await ')) logicSummary.push('Performs asynchronous operations.');

    return {
        deps: deps.length ? deps : ['None detected'],
        exports: exportsList.length ? exportsList : ['None detected or exported implicitly'],
        purpose: purpose || 'No module-level documentation provided.',
        logic: logicSummary.length ? logicSummary.join(' ') : 'Contains standard procedural logic.'
    };
}

async function run() {
    const serverFiles = await getFiles(SERVER_DIR);
    const clientFiles = await getFiles(CLIENT_DIR);
    
    const allFiles = [...serverFiles, ...clientFiles].sort();
    
    let md = '# Detailed RailAware File Analysis\n\n';
    md += 'This document provides a highly detailed breakdown of every source file in the project, including its dependencies, purpose, and outputs.\n\n';
    
    let currentDir = '';
    
    for (const file of allFiles) {
        const relativePath = path.relative(ROOT, file).replace(/\\/g, '/');
        const dirName = path.dirname(relativePath);
        
        if (dirName !== currentDir) {
            md += `\n## Directory: \`${dirName}\`\n\n`;
            currentDir = dirName;
        }
        
        md += `### \`${path.basename(file)}\`\n`;
        md += `**Path:** [${relativePath}](file:///e:/Railaware/${relativePath})\n\n`;
        
        try {
            const content = await promisify(fs.readFile)(file, 'utf8');
            const data = parseFileContext(content);
            
            md += `**Purpose & What it does:**\n${data.purpose}\n\n`;
            md += `**Code Characteristics / Checks:**\n${data.logic}\n\n`;
            md += `**Dependencies (Imports/Requires):**\n- ${data.deps.join('\n- ')}\n\n`;
            md += `**Outputs (Exports):**\n- ${data.exports.join('\n- ')}\n\n`;
            md += `---\n`;
        } catch (e) {
            md += `*Error reading file: ${e.message}*\n\n`;
        }
    }
    
    await promisify(fs.writeFile)(OUTPUT_FILE, md, 'utf8');
    console.log(`Generated detailed report at ${OUTPUT_FILE}`);
}

run().catch(console.error);
