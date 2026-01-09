const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'catalog_dump.html');

try {
    const htmlContent = fs.readFileSync(filePath, 'utf8');

    // Split by product container to ensure we process one product at a time
    // The class name comes from the user's provided HTML snippet
    const productBlocks = htmlContent.split('product_list-product__kuvj5');

    const products = [];

    console.log(`Found ${productBlocks.length} blocks`);

    productBlocks.forEach((block, index) => {
        // We skip the first block if it's before the first product
        if (!block.includes('product_title__t7dLU')) {
            console.log(`Block ${index}: No title found`);
            return;
        }
        if (index < 5) console.log(`Block ${index} content start:`, block.substring(0, 200).replace(/\n/g, ' '));


        // Extract Name
        // <h4 class="...">Name</h4>
        const nameMatch = block.match(/<h4\s+class="product_title__t7dLU"[^>]*>([\s\S]*?)<\/h4>/);
        const name = nameMatch ? nameMatch[1].replace(/\n/g, ' ').trim() : null;

        // Extract Price
        // <strong ...>COP...</strong>
        const priceMatch = block.match(/<strong\s+[^>]*class="product_price__hgX1S[^"]*"[^>]*>([\s\S]*?)<\/strong>/);
        let price = 0;
        if (priceMatch) {
            let priceText = priceMatch[1].replace(/\n/g, '').trim(); // Remove newlines first
            priceText = priceText.replace(/COP|&nbsp;|,/g, '').trim();
            price = parseFloat(priceText);
        }

        if (index < 5) {
            console.log(`Block ${index}: Name="${name}", Price=${price}`);
        }

        // Extract Image
        // Wrapper ... img ... src
        const imageMatch = block.match(/class="product_image-wrapper__wHSJ6"[\s\S]*?<img[\s\S]*?src="([^"]+)"/);
        const image = imageMatch ? imageMatch[1] : null;

        // Extract Category
        const categoryMatch = block.match(/<small\s+class="product_category__MfZs_"[^>]*>([\s\S]*?)<\/small>/);
        const rawCategory = categoryMatch ? categoryMatch[1].replace(/\n/g, ' ').trim() : 'Otros';


        if (name && price > 0) {
            products.push({
                name,
                price,
                image,
                rawCategory
            });
        }
    });

    fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(products, null, 2), 'utf8');
    console.log('Successfully wrote parsed products to products.json');

} catch (err) {
    console.error('Error parsing file:', err);
}
