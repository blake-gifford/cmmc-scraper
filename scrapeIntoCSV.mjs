import puppeteer from 'puppeteer';
import Papa from 'papaparse';
import fs from 'fs';

const buildURL = ({ currentPage = 1, pageSize = 500, typeId = 5 }) => (
    `https://cyberab.org/Catalog#!/c/s/Results/Format/list/Page/${currentPage}/Size/${pageSize}/Sort/NameAscending?attributesAll=%5ECountriesSupported%7C1&typeId=${typeId}`
);

const scrapeData = async (typeId) => {
    const url = buildURL({ typeId });
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0' });

    const names = await page.evaluate(() => {
        return [...document.querySelectorAll('.store-title span')]
            .map(el => el.textContent.trim());
    });

    const addresses = await page.evaluate(() => {
        const addressArray = [];

        document.querySelectorAll('tr.ng-scope').forEach((row) => {
            const addressText = row.querySelector('td:nth-child(2) span');
            if (addressText) {
                addressArray.push(addressText.textContent.trim());
            }
        });

        return addressArray;
    });

    const result = names.map((name, index) => {
        const obj = { name };

        const associatedAddresses = addresses.slice(index * 3, (index + 1) * 3);
        if (associatedAddresses.length > 0) {
            obj.address = associatedAddresses.join(", ");
        }
        return obj;
    });

    await browser.close()
    return result
};

const writeToCSV = async (data, filename) => {
    const columns = ['name', 'address'];
    const csv = Papa.unparse(data, { columns })
    fs.writeFileSync(filename, csv);
};

const [ccp, cca] = await Promise.all([
    scrapeData(5),
    scrapeData(16)
])

await Promise.all([
    writeToCSV(ccp, 'ccp.csv'),
    writeToCSV(cca, 'cca.csv')
])
