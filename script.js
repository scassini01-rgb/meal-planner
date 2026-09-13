const SUPABASE_URL = "https://ferocosprtohzfkartig.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yckr7WnirLVooq5iw3ZFgw_vJHDYE2s";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

supabaseClient
    .from("meals")
    .select("id")
    .limit(1)
    .then(({ error }) => {
        if (error) {
            console.error("Errore collegamento Supabase:", error);
        } else {
            console.log("✅ Supabase collegato correttamente");
        }
    });

const meals = document.querySelectorAll(".meal");

const mealModal = document.getElementById("mealModal");
const closeModalButton = document.getElementById("closeModal");
const saveButton = document.getElementById("saveMeal");
const deleteButton = document.getElementById("deleteMeal");
const mealInput = document.getElementById("mealInput");
const mealOptions = document.querySelectorAll(".meal-option");
const modalTitle = document.getElementById("modalTitle");

const ingredientsModal = document.getElementById("ingredientsModal");
const closeIngredientsModalButton = document.getElementById("closeIngredientsModal");
const ingredientsList = document.getElementById("ingredientsList");
const addIngredientButton = document.getElementById("addIngredient");
const saveIngredientsButton = document.getElementById("saveIngredients");
const ingredientsMealName = document.getElementById("ingredientsMealName");

const shoppingList = document.getElementById("shoppingList");
const shoppingCount = document.getElementById("shoppingCount");

const quickIngredientsList = document.getElementById("quickIngredientsList");
const addQuickIngredientButton = document.getElementById("addQuickIngredient");

const previousWeekButton = document.getElementById("previousWeek");
const nextWeekButton = document.getElementById("nextWeek");
const weekNumberElement = document.getElementById("weekNumber");
const weekYearElement = document.getElementById("weekYear");

const openHistoryButton = document.getElementById("openHistory");
const historyModal = document.getElementById("historyModal");
const closeHistoryButton = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");


let currentMeal = null;
let selectedType = null;
let currentIngredientMeal = null;


/* =========================
   COSTANTI
========================= */

const DAYS = [
    "lunedi",
    "martedi",
    "mercoledi",
    "giovedi",
    "venerdi",
    "sabato",
    "domenica"
];

const DAY_NAMES = [
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
    "Domenica"
];

const CURRENT_WEEK_KEY = "mealPlannerCurrentWeek";
const HISTORY_KEY = "mealPlannerHistory";
const MIGRATION_KEY = "mealPlanner-old-data-migrated";


/* =========================
   SETTIMANA ISO
========================= */

function getISOWeekInfo(date = new Date()) {
    const target = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    const dayNumber = target.getUTCDay() || 7;

    target.setUTCDate(
        target.getUTCDate() + 4 - dayNumber
    );

    const year = target.getUTCFullYear();

    const yearStart = new Date(
        Date.UTC(year, 0, 1)
    );

    const week = Math.ceil(
        (
            (
                (target - yearStart) / 86400000
            ) + 1
        ) / 7
    );

    return {
        year,
        week
    };
}


function getWeekStart(year, week) {
    const januaryFourth = new Date(
        Date.UTC(year, 0, 4)
    );

    const dayNumber =
        januaryFourth.getUTCDay() || 7;

    const monday = new Date(januaryFourth);

    monday.setUTCDate(
        januaryFourth.getUTCDate() -
        dayNumber +
        1 +
        (week - 1) * 7
    );

    return monday;
}


function getWeeksInYear(year) {
    return getISOWeekInfo(
        new Date(year, 11, 28)
    ).week;
}


/* =========================
   SETTIMANA CORRENTE
========================= */

function loadCurrentWeek() {
    const saved = localStorage.getItem(
        CURRENT_WEEK_KEY
    );

    if (!saved) {
        return getISOWeekInfo();
    }

    try {
        const parsed = JSON.parse(saved);

        if (
            typeof parsed.year === "number" &&
            typeof parsed.week === "number"
        ) {
            return parsed;
        }
    } catch (error) {
        console.warn(
            "Impossibile leggere la settimana salvata."
        );
    }

    return getISOWeekInfo();
}


let currentWeek = loadCurrentWeek();


function saveCurrentWeek() {
    localStorage.setItem(
        CURRENT_WEEK_KEY,
        JSON.stringify(currentWeek)
    );
}


/* =========================
   STORAGE SETTIMANA
========================= */

function getWeekPrefix() {
    return `mealPlanner-${currentWeek.year}-week-${currentWeek.week}`;
}


function getMealStorageKey(mealElement) {
    const day = mealElement.dataset.day;
    const mealType = mealElement.dataset.meal;

    return `${getWeekPrefix()}-${day}-${mealType}`;
}


function getShoppingStorageKey() {
    return `${getWeekPrefix()}-shoppingChecked`;
}


/* =========================
   DATI SETTIMANA
========================= */

function getWeekMealKeys(year, week) {
    const keys = [];

    DAYS.forEach((day) => {
        keys.push(
            `mealPlanner-${year}-week-${week}-${day}-pranzo`
        );

        keys.push(
            `mealPlanner-${year}-week-${week}-${day}-cena`
        );
    });

    return keys;
}


function countMealsInWeek(year, week) {
    const keys = getWeekMealKeys(year, week);

    let count = 0;

    keys.forEach((key) => {
        if (localStorage.getItem(key)) {
            count++;
        }
    });

    return count;
}


/* =========================
   MIGRAZIONE VECCHI DATI
========================= */

function migrateOldMeals() {
    if (localStorage.getItem(MIGRATION_KEY)) {
        return;
    }

    const todayWeek = getISOWeekInfo();

    const oldMeals = [];

    meals.forEach((meal) => {
        const day = meal.dataset.day;
        const mealType = meal.dataset.meal;

        const oldKey = `${day}-${mealType}`;
        const oldData = localStorage.getItem(oldKey);

        if (oldData) {
            oldMeals.push({
                oldKey,
                day,
                mealType,
                data: oldData
            });
        }
    });

    oldMeals.forEach((item) => {
        const newKey =
            `mealPlanner-${todayWeek.year}-week-${todayWeek.week}-${item.day}-${item.mealType}`;

        if (!localStorage.getItem(newKey)) {
            localStorage.setItem(
                newKey,
                item.data
            );
        }

        localStorage.removeItem(
            item.oldKey
        );
    });


    const oldShopping =
        localStorage.getItem("shoppingChecked");

    if (oldShopping) {
        localStorage.setItem(
            `mealPlanner-${todayWeek.year}-week-${todayWeek.week}-shoppingChecked`,
            oldShopping
        );

        localStorage.removeItem(
            "shoppingChecked"
        );
    }


    if (oldMeals.length > 0) {
        addWeekToHistory(
            todayWeek.year,
            todayWeek.week
        );
    }

    localStorage.setItem(
        MIGRATION_KEY,
        "true"
    );
}


/* =========================
   HEADER SETTIMANA
========================= */

function updateWeekDisplay() {
    weekNumberElement.textContent =
        currentWeek.week;

    weekYearElement.textContent =
        currentWeek.year;

    updateDayDates();
}


/* =========================
   DATE DEI GIORNI
========================= */

function updateDayDates() {
    const monday = getWeekStart(
        currentWeek.year,
        currentWeek.week
    );

    const dayHeaders =
        document.querySelectorAll(".day-header");

    dayHeaders.forEach(
        (header, index) => {
            const date = new Date(monday);

            date.setUTCDate(
                monday.getUTCDate() + index
            );

            const dayNumber =
                date.getUTCDate();

            header.innerHTML = `
                <span class="day-name">
                    ${DAY_NAMES[index]}
                </span>
                <span class="day-number">
                    ${dayNumber}
                </span>
            `;
        }
    );
}


/* =========================
   CAMBIO SETTIMANA
========================= */

function changeWeek(direction) {
    const monday = getWeekStart(
        currentWeek.year,
        currentWeek.week
    );

    monday.setUTCDate(
        monday.getUTCDate() +
        direction * 7
    );

    currentWeek = getISOWeekInfo(
        new Date(
            monday.getUTCFullYear(),
            monday.getUTCMonth(),
            monday.getUTCDate()
        )
    );

    saveCurrentWeek();

    updateWeekDisplay();
    loadMeals();
}


previousWeekButton.addEventListener(
    "click",
    () => {
        changeWeek(-1);
    }
);


nextWeekButton.addEventListener(
    "click",
    () => {
        changeWeek(1);
    }
);


/* =========================
   CLICK SULLE CARD
========================= */

meals.forEach((meal) => {
    meal.addEventListener(
        "click",
        (event) => {

            if (
                event.target.closest(".meal-action")
            ) {
                return;
            }

            const savedMeal =
                getSavedMeal(meal);

            if (!savedMeal) {
                openMealEditor(meal);
                return;
            }

            if (
                window.matchMedia(
                    "(max-width: 600px)"
                ).matches
            ) {
                meal.classList.toggle(
                    "mobile-actions-visible"
                );
            }
        }
    );
});


/* =========================
   MODAL PASTO
========================= */

function openMealEditor(meal) {
    currentMeal = meal;

    const savedMeal =
        getSavedMeal(meal);

    if (savedMeal) {
        mealInput.value =
            savedMeal.name;

        selectedType =
            savedMeal.type;

        modalTitle.textContent =
            "Modifica pasto";

        deleteButton.style.display =
            "block";

        loadQuickIngredients(
            savedMeal.ingredients || []
        );

    } else {

        mealInput.value = "";
        selectedType = null;

        modalTitle.textContent = "+";

        deleteButton.style.display =
            "none";

        loadQuickIngredients([]);
    }

    updateSelectedOption();
    openMealModal();
}


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


mealModal.addEventListener(
    "click",
    (event) => {
        if (event.target === mealModal) {
            closeMealModal();
        }
    }
);


/* =========================
   TIPO PASTO
========================= */

mealOptions.forEach((option) => {
    option.addEventListener(
        "click",
        () => {
            selectedType =
                option.dataset.type;

            updateSelectedOption();
        }
    );
});


function updateSelectedOption() {
    mealOptions.forEach((option) => {
        option.classList.remove("selected");

        if (
            option.dataset.type ===
            selectedType
        ) {
            option.classList.add("selected");
        }
    });
}


/* =========================
   INGREDIENTI RAPIDI
========================= */

function loadQuickIngredients(ingredients) {
    quickIngredientsList.innerHTML = "";

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


    const nameInput =
        document.createElement("input");

    nameInput.type = "text";

    nameInput.className =
        "quick-ingredient-input quick-name";

    nameInput.placeholder =
        "Ingrediente";

    nameInput.value =
        ingredientName;


    const quantityInput =
        document.createElement("input");

    quantityInput.type = "text";

    quantityInput.className =
        "quick-ingredient-input quick-quantity";

    quantityInput.placeholder =
        "Quantità";

    quantityInput.value =
        quantity;


    const removeButton =
        document.createElement("button");

    removeButton.type = "button";

    removeButton.className =
        "quick-ingredient-remove";

    removeButton.setAttribute(
        "aria-label",
        "Rimuovi ingrediente"
    );

    removeButton.innerHTML =
        '<i class="fa-solid fa-xmark"></i>';


    removeButton.addEventListener(
        "click",
        () => {
            row.remove();
        }
    );


    row.appendChild(nameInput);
    row.appendChild(quantityInput);
    row.appendChild(removeButton);

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
            row.querySelector(
                ".quick-name"
            ).value.trim();

        const quantity =
            row.querySelector(
                ".quick-quantity"
            ).value.trim();

        if (
            name !== "" &&
            quantity !== ""
        ) {
            ingredients.push({
                name,
                quantity
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


/* =========================
   SALVA PASTO
========================= */

saveButton.addEventListener(
    "click",
    () => {

        if (!currentMeal) {
            return;
        }

        const mealName =
            mealInput.value.trim();

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

        const mealData = {
            name: mealName,
            type: selectedType,
            ingredients:
                getQuickIngredients()
        };


        localStorage.setItem(
            getMealStorageKey(currentMeal),
            JSON.stringify(mealData)
        );


        renderMeal(
            currentMeal,
            mealData
        );

        updateShoppingList();

        addWeekToHistory(
            currentWeek.year,
            currentWeek.week
        );

        closeMealModal();
    }
);


/* =========================
   ELIMINA PASTO
========================= */

deleteButton.addEventListener(
    "click",
    () => {

        if (!currentMeal) {
            return;
        }

        localStorage.removeItem(
            getMealStorageKey(currentMeal)
        );

        resetMealElement(currentMeal);

        updateShoppingList();

        updateWeekHistory();

        closeMealModal();
    }
);


/* =========================
   RESET CARD
========================= */

function resetMealElement(mealElement) {
    mealElement.classList.remove("alone");
    mealElement.classList.remove("together");
    mealElement.classList.remove("has-meal");
    mealElement.classList.remove(
        "mobile-actions-visible"
    );

    const content =
        mealElement.querySelector(
            ".meal-content"
        );

    content.innerHTML =
        '<span class="empty-meal">+</span>';
}


/* =========================
   RENDER PASTO
========================= */

function renderMeal(
    mealElement,
    data
) {
    const content =
        mealElement.querySelector(
            ".meal-content"
        );

    mealElement.classList.remove("alone");
    mealElement.classList.remove("together");
    mealElement.classList.remove("has-meal");

    mealElement.classList.add(data.type);
    mealElement.classList.add("has-meal");


    const iconClass =
        data.type === "together"
            ? "fa-solid fa-heart"
            : "fa-regular fa-heart";


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
        content.querySelector(
            ".edit-action"
        );

    editButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            mealElement.classList.remove(
                "mobile-actions-visible"
            );

            openMealEditor(mealElement);
        }
    );


    const ingredientsButton =
        content.querySelector(
            ".ingredients-action"
        );

    ingredientsButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            mealElement.classList.remove(
                "mobile-actions-visible"
            );

            openIngredientsEditor(
                mealElement
            );
        }
    );
}


/* =========================
   MODAL INGREDIENTI
========================= */

function openIngredientsEditor(mealElement) {
    currentIngredientMeal =
        mealElement;

    const data =
        getSavedMeal(mealElement);

    if (!data) {
        return;
    }

    ingredientsMealName.textContent =
        data.name;

    ingredientsList.innerHTML = "";

    const ingredients =
        data.ingredients || [];

    if (ingredients.length === 0) {
        addIngredientRow();
    } else {
        ingredients.forEach(
            (ingredient) => {
                addIngredientRow(
                    ingredient.name,
                    ingredient.quantity
                );
            }
        );
    }

    ingredientsModal.classList.add(
        "active"
    );
}


function closeIngredientsModal() {
    ingredientsModal.classList.remove(
        "active"
    );

    currentIngredientMeal = null;
}


closeIngredientsModalButton.addEventListener(
    "click",
    closeIngredientsModal
);


ingredientsModal.addEventListener(
    "click",
    (event) => {
        if (
            event.target ===
            ingredientsModal
        ) {
            closeIngredientsModal();
        }
    }
);


addIngredientButton.addEventListener(
    "click",
    () => {
        addIngredientRow();
    }
);


function addIngredientRow(
    ingredientName = "",
    quantity = ""
) {
    const row =
        document.createElement("div");

    row.className =
        "ingredient-row";


    const nameInput =
        document.createElement("input");

    nameInput.type = "text";

    nameInput.className =
        "ingredient-input ingredient-name-input";

    nameInput.placeholder =
        "Ingrediente";

    nameInput.value =
        ingredientName;


    const quantityInput =
        document.createElement("input");

    quantityInput.type = "text";

    quantityInput.className =
        "ingredient-input ingredient-quantity-input";

    quantityInput.placeholder =
        "Quantità";

    quantityInput.value =
        quantity;


    const removeButton =
        document.createElement("button");

    removeButton.type = "button";

    removeButton.className =
        "remove-ingredient";

    removeButton.setAttribute(
        "aria-label",
        "Rimuovi ingrediente"
    );

    removeButton.innerHTML =
        '<i class="fa-solid fa-xmark"></i>';


    removeButton.addEventListener(
        "click",
        () => {
            row.remove();
        }
    );


    row.appendChild(nameInput);
    row.appendChild(quantityInput);
    row.appendChild(removeButton);

    ingredientsList.appendChild(row);
}


/* =========================
   SALVA INGREDIENTI
========================= */

saveIngredientsButton.addEventListener(
    "click",
    () => {

        if (!currentIngredientMeal) {
            return;
        }

        const rows =
            ingredientsList.querySelectorAll(
                ".ingredient-row"
            );

        const ingredients = [];

        rows.forEach((row) => {

            const name =
                row.querySelector(
                    ".ingredient-name-input"
                ).value.trim();

            const quantity =
                row.querySelector(
                    ".ingredient-quantity-input"
                ).value.trim();

            if (
                name !== "" &&
                quantity !== ""
            ) {
                ingredients.push({
                    name,
                    quantity
                });
            }
        });


        const mealData =
            getSavedMeal(
                currentIngredientMeal
            );

        if (!mealData) {
            return;
        }


        mealData.ingredients =
            ingredients;


        localStorage.setItem(
            getMealStorageKey(
                currentIngredientMeal
            ),
            JSON.stringify(mealData)
        );


        updateShoppingList();

        addWeekToHistory(
            currentWeek.year,
            currentWeek.week
        );

        closeIngredientsModal();
    }
);


/* =========================
   RECUPERA PASTO
========================= */

function getSavedMeal(mealElement) {
    const savedMeal =
        localStorage.getItem(
            getMealStorageKey(mealElement)
        );

    if (!savedMeal) {
        return null;
    }

    try {
        const data =
            JSON.parse(savedMeal);

        if (
            !Array.isArray(
                data.ingredients
            )
        ) {
            data.ingredients = [];
        }

        return data;

    } catch (error) {
        return null;
    }
}


/* =========================
   LISTA DELLA SPESA
========================= */

function updateShoppingList() {
    const aggregated =
        aggregateIngredients();

    shoppingList.innerHTML = "";

    shoppingCount.textContent =
        `${aggregated.length} ${
            aggregated.length === 1
                ? "ingrediente"
                : "ingredienti"
        }`;


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

        row.className =
            "shopping-item";


        const itemKey =
            normalizeIngredientName(
                item.name
            );


        if (
            checkedItems.includes(itemKey)
        ) {
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
            row.querySelector(
                ".shopping-check"
            );


        checkButton.addEventListener(
            "click",
            () => {

                toggleShoppingItem(itemKey);

                row.classList.toggle(
                    "checked"
                );
            }
        );


        shoppingList.appendChild(row);
    });
}


function getCheckedShoppingItems() {
    const saved =
        localStorage.getItem(
            getShoppingStorageKey()
        );

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
        getShoppingStorageKey(),
        JSON.stringify(checked)
    );
}


/* =========================
   AGGREGA INGREDIENTI
========================= */

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


        data.ingredients.forEach(
            (ingredient) => {

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
                    normalizeIngredientName(
                        name
                    );


                if (!groups.has(key)) {
                    groups.set(
                        key,
                        {
                            name,
                            quantities: []
                        }
                    );
                }


                groups
                    .get(key)
                    .quantities
                    .push(quantity);
            }
        );
    });


    const result = [];


    groups.forEach((group) => {

        result.push({
            name: group.name,
            quantity:
                combineQuantities(
                    group.quantities
                )
        });
    });


    result.sort(
        (a, b) =>
            a.name.localeCompare(
                b.name,
                "it"
            )
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
   QUANTITÀ
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
                    grams +=
                        item.value;
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
                    milliliters +=
                        item.value;
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
        value,
        unit
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


/* =========================
   STORICO
========================= */

function getHistory() {
    const saved =
        localStorage.getItem(HISTORY_KEY);

    if (!saved) {
        return [];
    }

    try {
        const history =
            JSON.parse(saved);

        return Array.isArray(history)
            ? history
            : [];

    } catch (error) {
        return [];
    }
}


function saveHistory(history) {
    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history)
    );
}


function addWeekToHistory(year, week) {
    const history =
        getHistory();

    const exists =
        history.some(
            (item) =>
                item.year === year &&
                item.week === week
        );


    if (!exists) {

        history.push({
            year,
            week
        });

        history.sort(
            (a, b) => {

                if (a.year !== b.year) {
                    return b.year - a.year;
                }

                return b.week - a.week;
            }
        );

        saveHistory(history);
    }
}


function removeWeekFromHistory(
    year,
    week
) {
    const history =
        getHistory().filter(
            (item) =>
                !(
                    item.year === year &&
                    item.week === week
                )
        );

    saveHistory(history);
}


function updateWeekHistory() {
    const count =
        countMealsInWeek(
            currentWeek.year,
            currentWeek.week
        );


    if (count > 0) {

        addWeekToHistory(
            currentWeek.year,
            currentWeek.week
        );

    } else {

        removeWeekFromHistory(
            currentWeek.year,
            currentWeek.week
        );
    }
}


function openHistory() {
    renderHistory();

    historyModal.classList.add(
        "active"
    );
}


function closeHistory() {
    historyModal.classList.remove(
        "active"
    );
}


openHistoryButton.addEventListener(
    "click",
    openHistory
);


closeHistoryButton.addEventListener(
    "click",
    closeHistory
);


historyModal.addEventListener(
    "click",
    (event) => {

        if (
            event.target === historyModal
        ) {
            closeHistory();
        }
    }
);


function renderHistory() {
    historyList.innerHTML = "";

    const history =
        getHistory();


    if (history.length === 0) {

        historyList.innerHTML = `
            <div class="history-empty">
                Nessuna settimana salvata.
            </div>
        `;

        return;
    }


    history.forEach((item) => {

        const count =
            countMealsInWeek(
                item.year,
                item.week
            );


        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "history-item";


        button.innerHTML = `
            <span class="history-item-main">

                <span class="history-item-week">
                    Settimana ${item.week}
                </span>

                <span class="history-item-year">
                    ${item.year}
                </span>

            </span>

            <span class="history-item-count">
                ${count}
                ${count === 1 ? "pasto" : "pasti"}
            </span>
        `;


        button.addEventListener(
            "click",
            () => {

                currentWeek = {
                    year: item.year,
                    week: item.week
                };

                saveCurrentWeek();

                updateWeekDisplay();
                loadMeals();

                closeHistory();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );


        historyList.appendChild(button);
    });
}


/* =========================
   ESC
========================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key !== "Escape") {
            return;
        }


        if (
            mealModal.classList.contains(
                "active"
            )
        ) {
            closeMealModal();
        }


        if (
            ingredientsModal.classList.contains(
                "active"
            )
        ) {
            closeIngredientsModal();
        }


        if (
            historyModal.classList.contains(
                "active"
            )
        ) {
            closeHistory();
        }
    }
);


/* =========================
   AZIONI MOBILE
========================= */

document.addEventListener(
    "click",
    (event) => {

        if (
            !event.target.closest(".meal")
        ) {

            meals.forEach((meal) => {

                meal.classList.remove(
                    "mobile-actions-visible"
                );
            });
        }
    }
);


/* =========================
   CARICAMENTO SETTIMANA
========================= */

function loadMeals() {

    meals.forEach((meal) => {

        resetMealElement(meal);

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


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {
    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}


/* =========================
   AVVIO
========================= */

migrateOldMeals();

updateWeekDisplay();

loadMeals();

updateWeekHistory();