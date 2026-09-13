const meals = document.querySelectorAll(".meal");

const mealModal = document.getElementById("mealModal");
const closeModalButton = document.getElementById("closeModal");
const saveButton = document.getElementById("saveMeal");
const deleteButton = document.getElementById("deleteMeal");
const mealInput = document.getElementById("mealInput");
const mealOptions = document.querySelectorAll(".meal-option");
const modalTitle = document.getElementById("modalTitle");

const ingredientsModal = document.getElementById("ingredientsModal");
const closeIngredientsModalButton = document.getElementById(
    "closeIngredientsModal"
);
const ingredientsList = document.getElementById("ingredientsList");
const addIngredientButton = document.getElementById("addIngredient");
const saveIngredientsButton = document.getElementById("saveIngredients");
const ingredientsMealName = document.getElementById("ingredientsMealName");

const shoppingList = document.getElementById("shoppingList");
const shoppingCount = document.getElementById("shoppingCount");
const quickIngredientsList =
    document.getElementById("quickIngredientsList");

const addQuickIngredientButton =
    document.getElementById("addQuickIngredient");

let currentMeal = null;
let selectedType = null;
let currentIngredientMeal = null;



meals.forEach((meal) => {
    meal.addEventListener("click", (event) => {

        if (event.target.closest(".meal-action")) {
            return;
        }

        const savedMeal = getSavedMeal(meal);

        if (!savedMeal) {
            openMealEditor(meal);
            return;
        }

        if (window.matchMedia("(max-width: 600px)").matches) {
            meal.classList.toggle("mobile-actions-visible");
        }
    });
});


function openMealEditor(meal) {

    currentMeal = meal;

    const savedMeal = getSavedMeal(meal);

    if (savedMeal) {

        mealInput.value = savedMeal.name;

        selectedType = savedMeal.type;

        modalTitle.textContent = "Modifica pasto";

        deleteButton.style.display = "block";

        loadQuickIngredients(
            savedMeal.ingredients || []
        );

    } else {

        mealInput.value = "";

        selectedType = null;

        modalTitle.textContent = "+";

        deleteButton.style.display = "none";

        loadQuickIngredients([]);

    }

    updateSelectedOption();

    openMealModal();
}

function loadQuickIngredients(ingredients) {

    quickIngredientsList.innerHTML = "";

    if (ingredients.length === 0) {
        return;
    }

    ingredients.forEach((ingredient) => {

        addQuickIngredientRow(
            ingredient.name,
            ingredient.quantity
        );

    });
}


function addQuickIngredientRow(
    ingredientName = "",
    quantity = ""
) {

    const row =
        document.createElement("div");

    row.className =
        "quick-ingredient-row";

    row.innerHTML = `

        <input
            type="text"
            class="quick-ingredient-input quick-name"
            placeholder="Ingrediente"
            value="${escapeAttribute(ingredientName)}"
        >

        <input
            type="text"
            class="quick-ingredient-input quick-quantity"
            placeholder="Quantità"
            value="${escapeAttribute(quantity)}"
        >

        <button
            type="button"
            class="quick-ingredient-remove"
            aria-label="Rimuovi ingrediente"
        >
            <i class="fa-solid fa-xmark"></i>
        </button>

    `;

    const removeButton =
        row.querySelector(
            ".quick-ingredient-remove"
        );

    removeButton.addEventListener(
        "click",
        () => {

            row.remove();

        }
    );

    quickIngredientsList.appendChild(row);
}


function getQuickIngredients() {

    const rows =
        quickIngredientsList.querySelectorAll(
            ".quick-ingredient-row"
        );

    const ingredients = [];

    rows.forEach((row) => {

        const name =
            row
                .querySelector(".quick-name")
                .value
                .trim();

        const quantity =
            row
                .querySelector(".quick-quantity")
                .value
                .trim();

        if (
            name !== "" &&
            quantity !== ""
        ) {

            ingredients.push({
                name: name,
                quantity: quantity
            });

        }

    });

    return ingredients;
}

addQuickIngredientButton.addEventListener(
    "click",
    () => {

        addQuickIngredientRow();

        const rows =
            quickIngredientsList.querySelectorAll(
                ".quick-ingredient-row"
            );

        const lastRow =
            rows[rows.length - 1];

        if (lastRow) {

            lastRow
                .querySelector(".quick-name")
                .focus();

        }

    }
);

function openMealModal() {

    mealModal.classList.add("active");

    setTimeout(() => {
        mealInput.focus();
    }, 100);
}


function closeMealModal() {

    mealModal.classList.remove("active");

    currentMeal = null;
    selectedType = null;
}


closeModalButton.addEventListener(
    "click",
    closeMealModal
);


mealModal.addEventListener("click", (event) => {

    if (event.target === mealModal) {
        closeMealModal();
    }

});



mealOptions.forEach((option) => {

    option.addEventListener("click", () => {

        selectedType = option.dataset.type;

        updateSelectedOption();

    });

});


function updateSelectedOption() {

    mealOptions.forEach((option) => {

        option.classList.remove("selected");

        if (option.dataset.type === selectedType) {
            option.classList.add("selected");
        }

    });

}



saveButton.addEventListener("click", () => {

    if (!currentMeal) {
        return;
    }

    const mealName = mealInput.value.trim();

    if (mealName === "") {
        mealInput.focus();
        return;
    }

    if (!selectedType) {

        alert(
            "Seleziona se il pasto è da soli oppure insieme."
        );

        return;
    }

    const day = currentMeal.dataset.day;
    const mealType = currentMeal.dataset.meal;

    const storageKey = `${day}-${mealType}`;

    const oldMeal = getSavedMeal(currentMeal);

    const mealData = {

    name: mealName,

    type: selectedType,

    ingredients: getQuickIngredients()

};

    localStorage.setItem(
        storageKey,
        JSON.stringify(mealData)
    );

    renderMeal(
        currentMeal,
        mealData
    );

    updateShoppingList();

    closeMealModal();

});



deleteButton.addEventListener("click", () => {

    if (!currentMeal) {
        return;
    }

    const day = currentMeal.dataset.day;
    const mealType = currentMeal.dataset.meal;

    const storageKey = `${day}-${mealType}`;

    localStorage.removeItem(storageKey);

    currentMeal.classList.remove("alone");
    currentMeal.classList.remove("together");
    currentMeal.classList.remove("has-meal");
    currentMeal.classList.remove("mobile-actions-visible");

    const content = currentMeal.querySelector(".meal-content");

    content.innerHTML = `
        <span class="empty-meal">+</span>
    `;

    updateShoppingList();

    closeMealModal();

});



function renderMeal(mealElement, data) {

    const content =
        mealElement.querySelector(".meal-content");

    mealElement.classList.remove("alone");
    mealElement.classList.remove("together");
    mealElement.classList.remove("has-meal");

    mealElement.classList.add(data.type);
    mealElement.classList.add("has-meal");

    let iconClass;

    if (data.type === "together") {
        iconClass = "fa-solid fa-heart";
    } else {
        iconClass = "fa-regular fa-heart";
    }

    content.innerHTML = `
        <span class="meal-name">
            ${escapeHTML(data.name)}
        </span>

        <i class="${iconClass} meal-type-icon"></i>

        <div class="meal-actions">

            <button
                type="button"
                class="meal-action edit-action"
                aria-label="Modifica pasto"
            >
                <i class="fa-solid fa-pen"></i>
            </button>

            <button
                type="button"
                class="meal-action ingredients-action"
                aria-label="Ingredienti"
            >
                <i class="fa-solid fa-scale-balanced"></i>
            </button>

        </div>
    `;


    const editButton =
        content.querySelector(".edit-action");

    editButton.addEventListener("click", (event) => {

        event.stopPropagation();

        mealElement.classList.remove(
            "mobile-actions-visible"
        );

        openMealEditor(mealElement);

    });


    const ingredientsButton =
        content.querySelector(".ingredients-action");

    ingredientsButton.addEventListener("click", (event) => {

        event.stopPropagation();

        mealElement.classList.remove(
            "mobile-actions-visible"
        );

        openIngredientsEditor(mealElement);

    });

}



function openIngredientsEditor(mealElement) {

    currentIngredientMeal = mealElement;

    const data = getSavedMeal(mealElement);

    if (!data) {
        return;
    }

    ingredientsMealName.textContent = data.name;

    ingredientsList.innerHTML = "";

    const ingredients = data.ingredients || [];

    if (ingredients.length === 0) {

        addIngredientRow();

    } else {

        ingredients.forEach((ingredient) => {

            addIngredientRow(
                ingredient.name,
                ingredient.quantity
            );

        });

    }

    ingredientsModal.classList.add("active");

}


function closeIngredientsModal() {

    ingredientsModal.classList.remove("active");

    currentIngredientMeal = null;

}


closeIngredientsModalButton.addEventListener(
    "click",
    closeIngredientsModal
);


ingredientsModal.addEventListener("click", (event) => {

    if (event.target === ingredientsModal) {
        closeIngredientsModal();
    }

});



addIngredientButton.addEventListener("click", () => {

    addIngredientRow();

});


function addIngredientRow(
    ingredientName = "",
    quantity = ""
) {

    const row = document.createElement("div");

    row.className = "ingredient-row";

    row.innerHTML = `
        <input
            type="text"
            class="ingredient-input ingredient-name-input"
            placeholder="Ingrediente"
            value="${escapeAttribute(ingredientName)}"
        >

        <input
            type="text"
            class="ingredient-input ingredient-quantity-input"
            placeholder="Quantità"
            value="${escapeAttribute(quantity)}"
        >

        <button
            type="button"
            class="remove-ingredient"
            aria-label="Rimuovi ingrediente"
        >
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;


    const removeButton =
        row.querySelector(".remove-ingredient");

    removeButton.addEventListener("click", () => {

        row.remove();

    });


    ingredientsList.appendChild(row);

}



saveIngredientsButton.addEventListener("click", () => {

    if (!currentIngredientMeal) {
        return;
    }

    const rows =
        ingredientsList.querySelectorAll(".ingredient-row");

    const ingredients = [];


    rows.forEach((row) => {

        const nameInput =
            row.querySelector(".ingredient-name-input");

        const quantityInput =
            row.querySelector(".ingredient-quantity-input");

        const name =
            nameInput.value.trim();

        const quantity =
            quantityInput.value.trim();


        if (name !== "" && quantity !== "") {

            ingredients.push({
                name: name,
                quantity: quantity
            });

        }

    });


    const day =
        currentIngredientMeal.dataset.day;

    const mealType =
        currentIngredientMeal.dataset.meal;

    const storageKey =
        `${day}-${mealType}`;


    const mealData =
        getSavedMeal(currentIngredientMeal);


    if (!mealData) {
        return;
    }


    mealData.ingredients = ingredients;


    localStorage.setItem(
        storageKey,
        JSON.stringify(mealData)
    );


    updateShoppingList();

    closeIngredientsModal();

});



function getSavedMeal(mealElement) {

    const day =
        mealElement.dataset.day;

    const mealType =
        mealElement.dataset.meal;

    const storageKey =
        `${day}-${mealType}`;

    const savedMeal =
        localStorage.getItem(storageKey);


    if (!savedMeal) {
        return null;
    }


    try {

        const data =
            JSON.parse(savedMeal);


        if (!Array.isArray(data.ingredients)) {
            data.ingredients = [];
        }


        return data;

    } catch (error) {

        return null;

    }

}



function updateShoppingList() {

    const aggregated =
        aggregateIngredients();


    shoppingList.innerHTML = "";


    if (shoppingCount) {

        shoppingCount.textContent =
            `${aggregated.length} ${
                aggregated.length === 1
                    ? "ingrediente"
                    : "ingredienti"
            }`;

    }


    if (aggregated.length === 0) {

        shoppingList.innerHTML = `
            <div class="shopping-empty">
                Nessun ingrediente aggiunto
            </div>
        `;

        return;
    }


    const checkedItems =
        getCheckedShoppingItems();


    aggregated.forEach((item) => {

        const row =
            document.createElement("div");

        row.className = "shopping-item";


        const itemKey =
            normalizeIngredientName(item.name);


        if (checkedItems.includes(itemKey)) {
            row.classList.add("checked");
        }


        row.innerHTML = `
            <button
                type="button"
                class="shopping-check"
                aria-label="Segna come acquistato"
            >
                <i class="fa-solid fa-check"></i>
            </button>

            <span class="shopping-ingredient">
                ${escapeHTML(item.name)}
            </span>

            <span class="shopping-quantity">
                ${escapeHTML(item.quantity)}
            </span>
        `;


        const checkButton =
            row.querySelector(".shopping-check");


        checkButton.addEventListener("click", () => {

            toggleShoppingItem(itemKey);

            row.classList.toggle("checked");

        });


        shoppingList.appendChild(row);

    });

}



function getCheckedShoppingItems() {

    const saved =
        localStorage.getItem("shoppingChecked");


    if (!saved) {
        return [];
    }


    try {

        const data =
            JSON.parse(saved);

        return Array.isArray(data)
            ? data
            : [];

    } catch (error) {

        return [];

    }

}


function toggleShoppingItem(itemKey) {

    const checked =
        getCheckedShoppingItems();


    const index =
        checked.indexOf(itemKey);


    if (index === -1) {

        checked.push(itemKey);

    } else {

        checked.splice(index, 1);

    }


    localStorage.setItem(
        "shoppingChecked",
        JSON.stringify(checked)
    );

}


function aggregateIngredients() {

    const groups = new Map();


    meals.forEach((meal) => {

        const data =
            getSavedMeal(meal);


        if (
            !data ||
            !Array.isArray(data.ingredients)
        ) {
            return;
        }


        data.ingredients.forEach((ingredient) => {

            const name =
                ingredient.name.trim();

            const quantity =
                ingredient.quantity.trim();


            if (
                name === "" ||
                quantity === ""
            ) {
                return;
            }


            const key =
                normalizeIngredientName(name);


            if (!groups.has(key)) {

                groups.set(key, {
                    name: name,
                    quantities: []
                });

            }


            groups
                .get(key)
                .quantities
                .push(quantity);

        });

    });


    const result = [];


    groups.forEach((group) => {

        result.push({
            name: group.name,
            quantity: combineQuantities(
                group.quantities
            )
        });

    });


    result.sort((a, b) =>
        a.name.localeCompare(b.name, "it")
    );


    return result;

}


/* =========================
   NORMALIZZA NOME
========================= */

function normalizeIngredientName(name) {

    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

}


/* =========================
   SOMMA QUANTITÀ
========================= */

function combineQuantities(quantities) {

    const parsed =
        quantities.map(parseQuantity);


    const allParsed =
        parsed.every(
            (item) => item !== null
        );


    if (allParsed) {

        const firstUnit =
            parsed[0].unit;


        const sameUnit =
            parsed.every(
                (item) =>
                    item.unit === firstUnit
            );


        if (sameUnit) {

            const total =
                parsed.reduce(
                    (sum, item) =>
                        sum + item.value,
                    0
                );


            return formatQuantity(
                total,
                firstUnit
            );

        }


        const weightUnits =
            parsed.every(
                (item) =>
                    item.unit === "g" ||
                    item.unit === "kg"
            );


        if (weightUnits) {

            let grams = 0;


            parsed.forEach((item) => {

                if (item.unit === "kg") {

                    grams +=
                        item.value * 1000;

                } else {

                    grams += item.value;

                }

            });


            return formatWeight(grams);

        }


        const liquidUnits =
            parsed.every(
                (item) =>
                    item.unit === "ml" ||
                    item.unit === "l"
            );


        if (liquidUnits) {

            let milliliters = 0;


            parsed.forEach((item) => {

                if (item.unit === "l") {

                    milliliters +=
                        item.value * 1000;

                } else {

                    milliliters += item.value;

                }

            });


            return formatLiquid(
                milliliters
            );

        }

    }


    return quantities.join(" + ");

}

function parseQuantity(text) {

    const normalized =
        text
            .trim()
            .toLowerCase()
            .replace(",", ".");


    const match =
        normalized.match(
            /^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|barattolo|barattoli|bottiglia|bottiglie|confezione|confezioni|pz|pezzo|pezzi|uovo|uova)?$/
        );


    if (!match) {
        return null;
    }


    const value =
        Number(match[1]);


    let unit =
        match[2] || "";


    if (
        unit === "barattolo" ||
        unit === "barattoli"
    ) {
        unit = "barattoli";
    }


    if (
        unit === "bottiglia" ||
        unit === "bottiglie"
    ) {
        unit = "bottiglie";
    }


    if (
        unit === "confezione" ||
        unit === "confezioni"
    ) {
        unit = "confezioni";
    }


    if (
        unit === "pz" ||
        unit === "pezzo" ||
        unit === "pezzi"
    ) {
        unit = "pz";
    }


    if (
        unit === "uovo" ||
        unit === "uova"
    ) {
        unit = "uova";
    }


    return {
        value: value,
        unit: unit
    };

}



function formatQuantity(value, unit) {

    const rounded =
        Number.isInteger(value)
            ? value
            : Number(value.toFixed(2));


    return `${rounded}${
        unit
            ? " " + unit
            : ""
    }`;

}


function formatWeight(grams) {

    if (grams >= 1000) {

        const kg =
            grams / 1000;


        const value =
            Number.isInteger(kg)
                ? kg
                : Number(kg.toFixed(2));


        return `${value} kg`;

    }


    return `${grams} g`;

}


function formatLiquid(milliliters) {

    if (milliliters >= 1000) {

        const liters =
            milliliters / 1000;


        const value =
            Number.isInteger(liters)
                ? liters
                : Number(liters.toFixed(2));


        return `${value} l`;

    }


    return `${milliliters} ml`;

}


function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


function escapeAttribute(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}


document.addEventListener("keydown", (event) => {

    if (event.key !== "Escape") {
        return;
    }


    if (mealModal.classList.contains("active")) {
        closeMealModal();
    }


    if (
        ingredientsModal.classList.contains("active")
    ) {
        closeIngredientsModal();
    }

});


document.addEventListener("click", (event) => {

    if (!event.target.closest(".meal")) {

        meals.forEach((meal) => {

            meal.classList.remove(
                "mobile-actions-visible"
            );

        });

    }

});

function loadMeals() {

    meals.forEach((meal) => {

        const savedMeal =
            getSavedMeal(meal);


        if (savedMeal) {

            renderMeal(
                meal,
                savedMeal
            );

        }

    });


    updateShoppingList();

}


loadMeals();