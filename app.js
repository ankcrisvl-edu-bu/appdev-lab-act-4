// ---------- Category & Product Objects ----------
function Category(id, name, description) {
    this.id = id;
    this.name = name;
    this.description = description;
}

function Product(name, code, price, stock, restock, category) {
    this.name = name;
    this.code = code;
    this.price = price;
    this.stock = stock;
    this.restock = restock;
    this.category = category; // linked object
}

// ---------- Predefined Categories ----------
const categories = [
    new Category(1, "Household", "Products for household use"),
    new Category(2, "Produce", "Fresh fruits and vegetables"),
    new Category(3, "Frozen Foods", "Frozen products"),
    new Category(4, "Beverages", "Drinks and juices")
];

// ---------- Load inventory ----------
let inventory = JSON.parse(localStorage.getItem("inventory")) || [];

// Map plain objects into Product + Category
inventory = inventory.map(it => {
    const categoryObj = categories.find(c => c.name === it.category) || categories[0];
    return new Product(
        it.name,
        it.code,
        Number(it.price) || 0,
        Number(it.stock) || 0,
        Number(it.restock) || 0,
        categoryObj
    );
});

// displayData is what's currently shown (so sort/filter won't mutate inventory)
let displayData = inventory.slice();
let currentView = localStorage.getItem("currentView") || "table"; // remembers last view

// ---------- Cart ----------
let cart = [];

// ---------- DOM references ----------
const form = document.getElementById("productForm");
const inventoryList = document.getElementById("list");

const tableBtn = document.getElementById("tableBtn");
const cardBtn = document.getElementById("cardBtn");

const updateBtn = document.getElementById("update");
const deleteBtn = document.getElementById("Delete");

const sortNameBtn = document.getElementById("sortName");
const sortPriceAscBtn = document.getElementById("sortPriceAsc");
const sortPriceDescBtn = document.getElementById("sortPriceDesc");
const sortStockBtn = document.getElementById("sortStock");
const filterRestockBtn = document.getElementById("filterRestock");
const sortCategoryBtn = document.getElementById("sortCategory");
const resetBtn = document.getElementById("reset");

const cartList = document.getElementById("cartList");
const checkoutBtn = document.getElementById("checkoutBtn");
const receiptBox = document.getElementById("receiptBox");

// ---------- Helpers ----------
function saveInventory() {
    const plainInventory = inventory.map(p => ({
        name: p.name,
        code: p.code,
        price: p.price,
        stock: p.stock,
        restock: p.restock,
        category: p.category.name
    }));
    localStorage.setItem("inventory", JSON.stringify(plainInventory));
    updateSummary(); 
}

function resetDisplayDataToInventory() {
    displayData = inventory.slice();
}

// ---------- Form: add product ----------
form.addEventListener("submit", function (e) {
    e.preventDefault();
    const itemName = document.getElementById("itemName").value.trim();
    const itemCode = document.getElementById("itemCode").value.trim();
    const itemPrice = parseFloat(document.getElementById("itemPrice").value) || 0;
    const itemStock = parseInt(document.getElementById("itemStock").value) || 0;
    const itemRestock = parseInt(document.getElementById("itemRestock").value) || 0;
    const itemCategory = document.getElementById("itemCategory").value;

    const categoryObj = categories.find(c => c.name === itemCategory) || categories[0];

    const record = new Product(
        itemName,
        itemCode,
        itemPrice,
        itemStock,
        itemRestock,
        categoryObj
    );

    inventory.push(record);

    console.log("Product added:", record);
    console.log("Current inventory:", inventory);

    saveInventory();
    resetDisplayDataToInventory();
    displayInventory();
    updateSummary(); 
    form.reset();
});

// ---------- Search setup ----------
function setupSearchInput(inventory) {
    const searchInput = document.getElementById("searchInput");
    const resultDiv = document.getElementById("updateResult");

    searchInput.addEventListener("input", function () {
        const query = this.value.toLowerCase();

        if (!query) {
            resultDiv.innerHTML = "";
            delete resultDiv.dataset.code;
            return;
        }

        const product = inventory.find(
            p => p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
        );

        if (product) {
            resultDiv.innerHTML = `
                <p><strong>${product.name}</strong> (${product.code})</p>
                <p>Price: ₱${product.price} | Stock: ${product.stock}</p>
                <label>New Price: <input type="number" id="newPrice" value="${product.price}"></label><br>
                <label>New Stock: <input type="number" id="newStock" value="${product.stock}"></label><br>
            `;
            resultDiv.dataset.code = product.code;
        } else {
            resultDiv.innerHTML = "<p>No matching product found.</p>";
            delete resultDiv.dataset.code;
        }
    });
}

// ---------- Update product ----------
updateBtn.addEventListener("click", function () {
    const resultDiv = document.getElementById("updateResult");
    const code = resultDiv.dataset.code;
    if (!code) return alert("No product selected!");

    const product = inventory.find(p => p.code === code);
    if (!product) return alert("Product not found");

    const newPrice = parseFloat(document.getElementById("newPrice").value);
    const newStock = parseInt(document.getElementById("newStock").value);

    if (!isNaN(newPrice)) product.price = newPrice;
    if (!isNaN(newStock)) product.stock = newStock;

    console.log(`Updated product (${code}):`, product);
    console.log("Inventory after update:", inventory);

    saveInventory();
    resetDisplayDataToInventory();
    displayInventory();

    alert("Product updated!");
});

// ---------- Delete product ----------
deleteBtn.addEventListener("click", function () {
    const resultDiv = document.getElementById("updateResult");
    const code = resultDiv.dataset.code;
    if (!code) return alert("No product selected!");

    const index = inventory.findIndex(p => p.code === code);
    if (index === -1) return alert("Product not found");

    const product = inventory[index];
    const confirmDelete = confirm(`Are you sure you want to delete "${product.name}" (${product.code})?`);
    if (!confirmDelete) return;

    inventory.splice(index, 1);

    console.log("Deleted:", product);
    console.log("Inventory after delete:", inventory);

    saveInventory();
    resetDisplayDataToInventory();
    displayInventory();

    resultDiv.innerHTML = "";
    alert("Product deleted!");
});

// ---------- Cart functions ----------
function addToCart(code, qty = 1) {
    const product = inventory.find(p => p.code === code);
    if (!product) return alert("Product not found");
    if (product.stock < qty) return alert("Not enough stock");

    let existing = cart.find(c => c.product.code === code);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ product, quantity: qty });
    }

    product.stock -= qty;

    console.log(`Added to cart: ${product.name} x${qty}`);
    saveInventory();
    resetDisplayDataToInventory();
    displayCart();
    displayInventory();
}

function displayCart() {
    const list = document.getElementById("cartList");
    list.innerHTML = "";

    if (cart.length === 0) {
        list.innerHTML = "<p>Cart is empty.</p>";
        return;
    }

    cart.forEach((item, index) => {
        const div = document.createElement("div");
        div.innerHTML = `
            ${item.product.name} - ₱${item.product.price} x 
            <input type="number" id="qty-${index}" value="${item.quantity}" min="1" style="width:60px">
            = ₱${(item.product.price * item.quantity).toFixed(2)}
            <button onclick="updateCartQuantity(${index})">Update</button>
            <button onclick="deleteCartItem(${index})">Delete</button>
        `;
        list.appendChild(div);
    });
}

function updateCartQuantity(index) {
    const input = document.getElementById(`qty-${index}`);
    const newQty = parseInt(input.value, 10);

    if (Number.isNaN(newQty) || newQty < 1) {
        alert("Quantity must be at least 1");
        input.value = cart[index].quantity;
        return;
    }

    const cartItem = cart[index];
    const oldQty = cartItem.quantity;
    const diff = newQty - oldQty;

    if (diff > 0 && cartItem.product.stock < diff) {
        alert("Not enough stock available!");
        input.value = oldQty;
        return;
    }

    cartItem.product.stock -= diff;
    cartItem.quantity = newQty;

    saveInventory();
    resetDisplayDataToInventory();
    displayCart();
    displayInventory();
}

function deleteCartItem(index) {
    const cartItem = cart[index];
    if (!cartItem) return;

    cartItem.product.stock += cartItem.quantity;
    cart.splice(index, 1);

    saveInventory();
    resetDisplayDataToInventory();
    displayCart();
    displayInventory();
}

function checkout() {
    if (cart.length === 0) {
        alert("Cart is empty. Cannot checkout.");
        return;
    }

    const receipt = generateReceipt();
    alert(receipt);

    cart = [];

    saveInventory();
    resetDisplayDataToInventory();
    displayCart();
    displayInventory();
    updateSummary(); 
}

function generateReceipt() {
    if (cart.length === 0) return "Cart is empty. Nothing to checkout.";

    let subtotal = 0;
    let receipt = "===== Receipt =====\n";

    cart.forEach(item => {
        const lineTotal = item.product.price * item.quantity;
        subtotal += lineTotal;
        receipt += `${item.product.name} (x${item.quantity}) - ₱${lineTotal.toFixed(2)}\n`;
    });

    const tax = subtotal * 0.12;
    let discount = subtotal > 5000 ? subtotal * 0.10 : 0;
    const total = subtotal + tax - discount;

    receipt += "-------------------\n";
    receipt += `Subtotal: ₱${subtotal.toFixed(2)}\n`;
    receipt += `VAT (12%): ₱${tax.toFixed(2)}\n`;
    if (discount > 0) receipt += `Discount (10%): -₱${discount.toFixed(2)}\n`;
    receipt += `TOTAL: ₱${total.toFixed(2)}\n`;
    receipt += "===================\n";

    return receipt;
}

// ---------- Display ----------
function displayInventory(data = displayData) {
    inventoryList.innerHTML = "";

    if (!data || data.length === 0) {
        inventoryList.textContent = "No products in inventory.";
        return;
    }

    currentView === "table" ? renderTable(data) : renderCards(data);
}

function renderTable(data) {
    const table = document.createElement("table");
    table.border = "1";
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.marginTop = "10px";

    const headerRow = document.createElement("tr");
    ["Name", "Code", "Price", "Stock", "Restock Threshold", "Category", "Action"].forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        th.style.padding = "6px 8px";
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    data.forEach(rec => {
        const row = document.createElement("tr");

        if (rec.stock < rec.restock) {
            row.style.backgroundColor = "crimson";
            row.style.color = "white";
        }

        [rec.name, rec.code, rec.price, rec.stock, rec.restock, rec.category.name].forEach(val => {
            const td = document.createElement("td");
            td.textContent = val;
            td.style.padding = "6px 8px";
            row.appendChild(td);
        });

        const actionTd = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "Add to Cart";
        btn.onclick = () => addToCart(rec.code, 1);
        actionTd.appendChild(btn);
        row.appendChild(actionTd);

        table.appendChild(row);
    });

    inventoryList.appendChild(table);
}

function renderCards(data) {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.gap = "12px";
    container.style.marginTop = "10px";

    data.forEach(rec => {
        const card = document.createElement("div");
        card.style.border = "1px solid #333";
        card.style.padding = "10px";
        card.style.width = "220px";
        card.style.borderRadius = "6px";

        if (rec.stock < rec.restock) {
            card.style.backgroundColor = "crimson";
            card.style.color = "white";
        }

        card.innerHTML = `
            <strong>${rec.name}</strong><br>
            Code: ${rec.code}<br>
            Price: ₱${rec.price}<br>
            Stock: ${rec.stock}<br>
            Restock: ${rec.restock}<br>
            Category: ${rec.category.name}<br>
        `;

        const btn = document.createElement("button");
        btn.textContent = "Add to Cart";
        btn.onclick = () => addToCart(rec.code, 1);
        card.appendChild(btn);

        container.appendChild(card);
    });

    inventoryList.appendChild(container);
}

// ---------- View switching ----------
tableBtn && tableBtn.addEventListener("click", () => {
    currentView = "table";
    localStorage.setItem("currentView", currentView);
    displayInventory();
});

cardBtn && cardBtn.addEventListener("click", () => {
    currentView = "card";
    localStorage.setItem("currentView", currentView);
    displayInventory();
});

// ---------- Sorting / Filtering / Reset ----------
sortNameBtn && sortNameBtn.addEventListener("click", () => {
    displayData = inventory.slice().sort((a, b) => a.name.localeCompare(b.name));
    displayInventory();
});

sortPriceAscBtn && sortPriceAscBtn.addEventListener("click", () => {
    displayData = inventory.slice().sort((a, b) => b.price - a.price);
    displayInventory();
});

sortPriceDescBtn && sortPriceDescBtn.addEventListener("click", () => {
    displayData = inventory.slice().sort((a, b) => a.price - b.price);
    displayInventory();
});

sortStockBtn && sortStockBtn.addEventListener("click", () => {
    displayData = inventory.slice().sort((a, b) => a.stock - b.stock);
    displayInventory();
});

sortCategoryBtn && sortCategoryBtn.addEventListener("click", () => {
    displayData = inventory.slice().sort((a, b) => 
        a.category.name.localeCompare(b.category.name)
    );
    displayInventory();
});

filterRestockBtn && filterRestockBtn.addEventListener("click", () => {
    displayData = inventory.filter(item => item.stock < item.restock);
    displayInventory();
});

resetBtn && resetBtn.addEventListener("click", () => {
    resetDisplayDataToInventory();
    displayInventory();
});

// ---------- Summary Section ----------
function updateSummary() {
    const summaryDiv = document.getElementById("summary");

    if (!inventory.length) {
        summaryDiv.innerHTML = "<p>No products in inventory.</p>";
        return;
    }

    const totalItems = inventory.length;
    const totalStock = inventory.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = inventory.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockCount = inventory.filter(p => p.stock < p.restock).length;

    summaryDiv.innerHTML = `
        <h4>Summary Report</h4>
        <p><strong>Total Products:</strong> ${totalItems}</p>
        <p><strong>Total Stock Units:</strong> ${totalStock}</p>
        <p><strong>Total Inventory Value:</strong> ₱${totalValue.toFixed(2)}</p>
        <p><strong>Items Below Restock Threshold:</strong> ${lowStockCount}</p>
    `;
}

// ---------- Checkout ----------
checkoutBtn && checkoutBtn.addEventListener("click", checkout);

// ---------- Initial render ----------
displayInventory();
displayCart();
updateSummary();
setupSearchInput(inventory);