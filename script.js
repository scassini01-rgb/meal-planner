const SUPABASE_URL = "https://ferocosprtohzfkartig.supabase.co";

// INCOLLA QUI LA TUA PUBLISHABLE KEY
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yckr7WnirLVooq5iw3ZFgw_vJHDYE2s";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   ELEMENTI DOM
   ========================================================= */

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


/* =========================================================
   STATO
   ========================================================= */

let currentMeal = null;
let selectedType = null;
let currentIngredientMeal = null;

let currentWeekMeals = [];
let currentShoppingChecked = [];

let currentUser = null;
let realtimeChannel = null;


/* =========================================================
   COSTANTI
   ========================================================= */

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
const OLD_MIGRATION_KEY = "mealPlanner-old-data-migrated";
const LOCAL_SUPABASE_MIGRATION_KEY = "mealPlanner-supabase-migration-done";


/* =========================================================
   SETTIMANA ISO
   ========================================================= */

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
            ((target - yearStart) / 86400000) + 1
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


/* =========================================================
   SETTIMANA CORRENTE
   ========================================================= */

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


/* =========================================================
   SETTIMANA / DATE
   ========================================================= */

function updateWeekDisplay() {
    weekNumberElement.textContent = currentWeek.week;
    weekYearElement.textContent = currentWeek.year;

    updateDayDates();
}


function updateDayDates() {
    const monday = getWeekStart(
        currentWeek.year,
        currentWeek.week
    );

    const dayHeaders =
        document.querySelectorAll(".day-header");

    dayHeaders.forEach((header, index) => {
        const date = new Date(monday);

        date.setUTCDate(
            monday.getUTCDate() + index
        );

        const dayNumber = date.getUTCDate();

        header.innerHTML = `
            <span class="day-name">
                ${DAY_NAMES[index]}
            </span>
            <span class="day-number">
                ${dayNumber}
            </span>
        `;
    });
}


function changeWeek(direction) {
    const monday = getWeekStart(
        currentWeek.year,
        currentWeek.week
    );

    monday.setUTCDate(
        monday.getUTCDate() + direction * 7
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
    loadWeekFromSupabase();
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


/* =========================================================
   AUTENTICAZIONE
   ========================================================= */

async function getCurrentUser() {
    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        currentUser = null;
        return null;
    }

    currentUser = data.user || null;
    return currentUser;
}


async function loginUser() {
    const email = window.prompt(
        "Inserisci la tua email:"
    );

    if (!email) {
        return false;
    }

    const password = window.prompt(
        "Inserisci la tua password:"
    );

    if (!password) {
        return false;
    }

    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password
    });

    if (error) {
        alert(
            "Accesso non riuscito:\n" +
            error.message
        );
        return false;
    }

    currentUser = data.user;

    alert(
        "Accesso effettuato! Ora puoi modificare il planner."
    );

    await migrateLocalDataToSupabase();
    await loadWeekFromSupabase();

    return true;
}


async function requireLogin() {
    if (currentUser) {
        return true;
    }

    const confirmed = window.confirm(
        "Per modificare il planner devi accedere.\n\n" +
        "Vuoi effettuare l'accesso?"
    );

    if (!confirmed) {
        return false;
    }

    return await loginUser();
}


/* =========================================================
   SUPABASE - CARICAMENTO PASTI
   ========================================================= */

async function loadWeekMealsFromSupabase() {
    const {
        data,
        error
    } = await supabaseClient
        .from("meals")
        .select("*")
        .eq("week_year", currentWeek.year)
        .eq("week_number", currentWeek.week);

    if (error) {
        console.error(
            "Errore caricamento pasti:",
            error
        );

        currentWeekMeals = [];
        return [];
    }

    currentWeekMeals = data || [];

    return currentWeekMeals;
}


async function loadShoppingFromSupabase() {
    const {
        data,
        error
    } = await supabaseClient
        .from("shopping_checked")
        .select("*")
        .eq("week_year", currentWeek.year)
        .eq("week_number", currentWeek.week);

    if (error) {
        console.error(
            "Errore caricamento lista spesa:",
            error
        );

        currentShoppingChecked = [];
        return [];
    }

    currentShoppingChecked = data || [];

    return currentShoppingChecked;
}


async function loadWeekFromSupabase() {
    await loadWeekMealsFromSupabase();
    await loadShoppingFromSupabase();

    renderAllMeals();
    updateShoppingList();
    await updateWeekHistory();
}


/* =========================================================
   CONVERSIONE DATI
   ========================================================= */

function databaseMealToFrontend(row) {
    return {
        name: row.name || "",
        type: row.together
            ? "together"
            : "alone",
        ingredients:
            Array.isArray(row.ingredients)
                ? row.ingredients
                : []
    };
}


function frontendMealToDatabase(mealElement, data) {
    return {
        week_year: currentWeek.year,
        week_number: currentWeek.week,
        day_name: mealElement.dataset.day,
        meal_type: mealElement.dataset.meal,
        name: data.name,
        together: data.type === "together",
        ingredients: data.ingredients || [],
        updated_at: new Date().toISOString()
    };
}


/* =========================================================
   RECUPERA PASTO
   ========================================================= */

function findDatabaseMeal(mealElement) {
    return currentWeekMeals.find(
        (row) =>
            row.day_name === mealElement.dataset.day &&
            row.meal_type === mealElement.dataset.meal
    ) || null;
}


function getSavedMeal(mealElement) {
    const databaseMeal =
        findDatabaseMeal(mealElement);

    if (!databaseMeal) {
        return null;
    }

    return databaseMealToFrontend(
        databaseMeal
    );
}


/* =========================================================
   SALVA PASTO SU SUPABASE
   ========================================================= */

async function saveMealToSupabase(
    mealElement,
    mealData
) {
    if (!await requireLogin()) {
        return false;
    }

    const databaseData =
        frontendMealToDatabase(
            mealElement,
            mealData
        );

    const existing =
        findDatabaseMeal(mealElement);

    let result;

    if (existing) {
        result = await supabaseClient
            .from("meals")
            .update(databaseData)
            .eq("id", existing.id)
            .select()
            .single();
    } else {
        result = await supabaseClient
            .from("meals")
            .insert(databaseData)
            .select()
            .single();
    }

    if (result.error) {
        console.error(
            "Errore salvataggio pasto:",
            result.error
        );

        alert(
            "Non è stato possibile salvare il pasto:\n" +
            result.error.message
        );

        return false;
    }

    if (existing) {
        const index =
            currentWeekMeals.findIndex(
                (row) => row.id === existing.id
            );

        if (index !== -1) {
            currentWeekMeals[index] =
                result.data;
        }
    } else {
        currentWeekMeals.push(result.data);
    }

    return true;
}


/* =========================================================
   ELIMINA PASTO DA SUPABASE
   ========================================================= */

async function deleteMealFromSupabase(
    mealElement
) {
    if (!await requireLogin()) {
        return false;
    }

    const existing =
        findDatabaseMeal(mealElement);

    if (!existing) {
        return true;
    }

    const {
        error
    } = await supabaseClient
        .from("meals")
        .delete()
        .eq("id", existing.id);

    if (error) {
        console.error(
            "Errore eliminazione pasto:",
            error
        );

        alert(
            "Non è stato possibile eliminare il pasto:\n" +
            error.message
        );

        return false;
    }

    currentWeekMeals =
        currentWeekMeals.filter(
            (row) => row.id !== existing.id
        );

    return true;
}


/* =========================================================
   CLICK SULLE CARD
   ========================================================= */

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


/* =========================================================
   MODAL PASTO
   ========================================================= */

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


/* =========================================================
   TIPO PASTO
   ========================================================= */

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
        option.classList.remove(
            "selected"
        );

        if (
            option.dataset.type ===
            selectedType
        ) {
            option.classList.add(
                "selected"
            );
        }
    });
}


/* =========================================================
   INGREDIENTI RAPIDI
   ========================================================= */

function loadQuickIngredients(
    ingredients
) {
    quickIngredientsList.innerHTML = "";

    ingredients.forEach(
        (ingredient) => {
            addQuickIngredientRow(
                ingredient.name,
                ingredient.quantity
            );
        }
    );
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
                .querySelector(
                    ".quick-name"
                )
                .focus();
        }
    }
);


/* =========================================================
   SALVA PASTO
   ========================================================= */

saveButton.addEventListener(
    "click",
    async () => {
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

        const saved =
            await saveMealToSupabase(
                currentMeal,
                mealData
            );

        if (!saved) {
            return;
        }

        renderMeal(
            currentMeal,
            mealData
        );

        updateShoppingList();

        closeMealModal();

        await updateWeekHistory();
    }
);


/* =========================================================
   ELIMINA PASTO
   ========================================================= */

deleteButton.addEventListener(
    "click",
    async () => {
        if (!currentMeal) {
            return;
        }

        const deleted =
            await deleteMealFromSupabase(
                currentMeal
            );

        if (!deleted) {
            return;
        }

        resetMealElement(
            currentMeal
        );

        updateShoppingList();

        await updateWeekHistory();

        closeMealModal();
    }
);


/* =========================================================
   RESET CARD
   ========================================================= */

function resetMealElement(
    mealElement
) {
    mealElement.classList.remove(
        "alone"
    );

    mealElement.classList.remove(
        "together"
    );

    mealElement.classList.remove(
        "has-meal"
    );

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


/* =========================================================
   RENDER PASTO
   ========================================================= */

function renderMeal(
    mealElement,
    data
) {
    const content =
        mealElement.querySelector(
            ".meal-content"
        );

    mealElement.classList.remove(
        "alone"
    );

    mealElement.classList.remove(
        "together"
    );

    mealElement.classList.remove(
        "has-meal"
    );

    mealElement.classList.add(
        data.type
    );

    mealElement.classList.add(
        "has-meal"
    );

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

            openMealEditor(
                mealElement
            );
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


/* =========================================================
   RENDER TUTTI I PASTI
   ========================================================= */

function renderAllMeals() {
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
}


/* =========================================================
   MODAL INGREDIENTI
   ========================================================= */

function openIngredientsEditor(
    mealElement
) {
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


/* =========================================================
   SALVA INGREDIENTI
   ========================================================= */

saveIngredientsButton.addEventListener(
    "click",
    async () => {
        if (!currentIngredientMeal) {
            return;
        }

        if (!await requireLogin()) {
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

        const saved =
            await saveMealToSupabase(
                currentIngredientMeal,
                mealData
            );

        if (!saved) {
            return;
        }

        closeIngredientsModal();

        updateShoppingList();
    }
);


/* =========================================================
   LISTA DELLA SPESA
   ========================================================= */

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

    aggregated.forEach((item) => {
        const row =
            document.createElement("div");

        row.className =
            "shopping-item";

        const itemKey =
            normalizeIngredientName(
                item.name
            );

        const isChecked =
            currentShoppingChecked.some(
                (entry) =>
                    normalizeIngredientName(
                        entry.ingredient_name
                    ) === itemKey &&
                    entry.checked === true
            );

        if (isChecked) {
            row.classList.add(
                "checked"
            );
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
            async () => {
                if (!await requireLogin()) {
                    return;
                }

                const newChecked =
                    !row.classList.contains(
                        "checked"
                    );

                const saved =
                    await saveShoppingCheck(
                        itemKey,
                        item.name,
                        newChecked
                    );

                if (saved) {
                    row.classList.toggle(
                        "checked",
                        newChecked
                    );
                }
            }
        );

        shoppingList.appendChild(row);
    });
}


/* =========================================================
   SALVA CHECK LIST SU SUPABASE
   ========================================================= */

async function saveShoppingCheck(
    itemKey,
    displayName,
    checked
) {
    if (!currentUser) {
        return false;
    }

    const existing =
        currentShoppingChecked.find(
            (entry) =>
                normalizeIngredientName(
                    entry.ingredient_name
                ) === itemKey
        );

    if (checked) {
        if (existing) {
            const {
                data,
                error
            } = await supabaseClient
                .from("shopping_checked")
                .update({
                    checked: true
                })
                .eq("id", existing.id)
                .select()
                .single();

            if (error) {
                console.error(
                    "Errore aggiornamento spesa:",
                    error
                );
                return false;
            }

            const index =
                currentShoppingChecked.findIndex(
                    (entry) =>
                        entry.id === existing.id
                );

            currentShoppingChecked[index] =
                data;
        } else {
            const {
                data,
                error
            } = await supabaseClient
                .from("shopping_checked")
                .insert({
                    week_year: currentWeek.year,
                    week_number: currentWeek.week,
                    ingredient_name: displayName,
                    checked: true
                })
                .select()
                .single();

            if (error) {
                console.error(
                    "Errore salvataggio spesa:",
                    error
                );
                return false;
            }

            currentShoppingChecked.push(
                data
            );
        }
    } else {
        if (!existing) {
            return true;
        }

        const {
            error
        } = await supabaseClient
            .from("shopping_checked")
            .delete()
            .eq("id", existing.id);

        if (error) {
            console.error(
                "Errore eliminazione spesa:",
                error
            );
            return false;
        }

        currentShoppingChecked =
            currentShoppingChecked.filter(
                (entry) =>
                    entry.id !== existing.id
            );
    }

    return true;
}


/* =========================================================
   AGGREGA INGREDIENTI
   ========================================================= */

function aggregateIngredients() {
    const groups = new Map();

    currentWeekMeals.forEach((row) => {
        const data =
            databaseMealToFrontend(row);

        if (
            !data ||
            !Array.isArray(
                data.ingredients
            )
        ) {
            return;
        }

        data.ingredients.forEach(
            (ingredient) => {
                const name =
                    String(
                        ingredient.name || ""
                    ).trim();

                const quantity =
                    String(
                        ingredient.quantity || ""
                    ).trim();

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


/* =========================================================
   NORMALIZZA NOME
   ========================================================= */

function normalizeIngredientName(
    name
) {
    return String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}


/* =========================================================
   QUANTITÀ
   ========================================================= */

function combineQuantities(
    quantities
) {
    const parsed =
        quantities.map(
            parseQuantity
        );

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


function formatQuantity(
    value,
    unit
) {
    const rounded =
        Number.isInteger(value)
            ? value
            : Number(
                value.toFixed(2)
            );

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
                : Number(
                    kg.toFixed(2)
                );

        return `${value} kg`;
    }

    return `${grams} g`;
}


function formatLiquid(
    milliliters
) {
    if (milliliters >= 1000) {
        const liters =
            milliliters / 1000;

        const value =
            Number.isInteger(liters)
                ? liters
                : Number(
                    liters.toFixed(2)
                );

        return `${value} l`;
    }

    return `${milliliters} ml`;
}


/* =========================================================
   STORICO DA SUPABASE
   ========================================================= */

async function updateWeekHistory() {
    const {
        data,
        error
    } = await supabaseClient
        .from("meals")
        .select(
            "week_year, week_number"
        );

    if (error) {
        console.error(
            "Errore caricamento storico:",
            error
        );
        return;
    }

    const weeks = new Map();

    (data || []).forEach((row) => {
        const key =
            `${row.week_year}-${row.week_number}`;

        if (!weeks.has(key)) {
            weeks.set(
                key,
                {
                    year: row.week_year,
                    week: row.week_number,
                    count: 0
                }
            );
        }

        weeks.get(key).count++;
    });

    window.mealPlannerHistory =
        Array.from(
            weeks.values()
        ).sort((a, b) => {
            if (a.year !== b.year) {
                return b.year - a.year;
            }

            return b.week - a.week;
        });
}


async function openHistory() {
    await updateWeekHistory();

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
        window.mealPlannerHistory || [];

    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                Nessuna settimana salvata.
            </div>
        `;

        return;
    }

    history.forEach((item) => {
        const button =
            document.createElement(
                "button"
            );

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
                ${item.count}
                ${item.count === 1
                    ? "pasto"
                    : "pasti"}
            </span>
        `;

        button.addEventListener(
            "click",
            async () => {
                currentWeek = {
                    year: item.year,
                    week: item.week
                };

                saveCurrentWeek();
                updateWeekDisplay();

                await loadWeekFromSupabase();

                closeHistory();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );

        historyList.appendChild(
            button
        );
    });
}


/* =========================================================
   MIGRAZIONE VECCHI DATI LOCALSTORAGE → SUPABASE
   ========================================================= */

async function migrateLocalDataToSupabase() {
    if (!currentUser) {
        return;
    }

    if (
        localStorage.getItem(
            LOCAL_SUPABASE_MIGRATION_KEY
        )
    ) {
        return;
    }

    const localMeals = [];

    for (let year = 2024; year <= 2030; year++) {
        const maxWeeks =
            getWeeksInYear(year);

        for (
            let week = 1;
            week <= maxWeeks;
            week++
        ) {
            DAYS.forEach((day) => {
                ["pranzo", "cena"].forEach(
                    (mealType) => {
                        const key =
                            `mealPlanner-${year}-week-${week}-${day}-${mealType}`;

                        const saved =
                            localStorage.getItem(
                                key
                            );

                        if (!saved) {
                            return;
                        }

                        try {
                            const parsed =
                                JSON.parse(
                                    saved
                                );

                            if (
                                !parsed.name
                            ) {
                                return;
                            }

                            localMeals.push({
                                week_year: year,
                                week_number: week,
                                day_name: day,
                                meal_type: mealType,
                                name: parsed.name,
                                together:
                                    parsed.type === "together",
                                ingredients:
                                    Array.isArray(
                                        parsed.ingredients
                                    )
                                        ? parsed.ingredients
                                        : []
                            });
                        } catch (error) {
                            console.warn(
                                "Dato locale non valido:",
                                key
                            );
                        }
                    }
                );
            });
        }
    }

    if (localMeals.length > 0) {
        for (const meal of localMeals) {
            const {
                data: existing,
                error: searchError
            } = await supabaseClient
                .from("meals")
                .select("id")
                .eq(
                    "week_year",
                    meal.week_year
                )
                .eq(
                    "week_number",
                    meal.week_number
                )
                .eq(
                    "day_name",
                    meal.day_name
                )
                .eq(
                    "meal_type",
                    meal.meal_type
                )
                .maybeSingle();

            if (searchError) {
                console.warn(
                    "Impossibile controllare pasto locale:",
                    searchError
                );
                continue;
            }

            if (existing) {
                continue;
            }

            const {
                error
            } = await supabaseClient
                .from("meals")
                .insert(meal);

            if (error) {
                console.warn(
                    "Impossibile importare pasto:",
                    error
                );
            }
        }
    }

    localStorage.setItem(
        LOCAL_SUPABASE_MIGRATION_KEY,
        "true"
    );

    console.log(
        "✅ Migrazione dati locali completata."
    );
}


/* =========================================================
   MIGRAZIONE VECCHI DATI ORIGINALI
   ========================================================= */

function migrateOldMeals() {
    if (
        localStorage.getItem(
            OLD_MIGRATION_KEY
        )
    ) {
        return;
    }

    const todayWeek =
        getISOWeekInfo();

    meals.forEach((meal) => {
        const day =
            meal.dataset.day;

        const mealType =
            meal.dataset.meal;

        const oldKey =
            `${day}-${mealType}`;

        const oldData =
            localStorage.getItem(
                oldKey
            );

        if (!oldData) {
            return;
        }

        const newKey =
            `mealPlanner-${todayWeek.year}-week-${todayWeek.week}-${day}-${mealType}`;

        if (
            !localStorage.getItem(
                newKey
            )
        ) {
            localStorage.setItem(
                newKey,
                oldData
            );
        }

        localStorage.removeItem(
            oldKey
        );
    });

    const oldShopping =
        localStorage.getItem(
            "shoppingChecked"
        );

    if (oldShopping) {
        const newKey =
            `mealPlanner-${todayWeek.year}-week-${todayWeek.week}-shoppingChecked`;

        localStorage.setItem(
            newKey,
            oldShopping
        );

        localStorage.removeItem(
            "shoppingChecked"
        );
    }

    localStorage.setItem(
        OLD_MIGRATION_KEY,
        "true"
    );
}


/* =========================================================
   REALTIME
   ========================================================= */

function setupRealtime() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(
            realtimeChannel
        );
    }

    realtimeChannel =
        supabaseClient
            .channel(
                "meal-planner-live"
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "meals"
                },
                async () => {
                    await loadWeekFromSupabase();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "shopping_checked"
                },
                async () => {
                    await loadWeekFromSupabase();
                }
            )
            .subscribe();
}


/* =========================================================
   REFRESH QUANDO SI TORNA SULLA PAGINA
   ========================================================= */

window.addEventListener(
    "focus",
    async () => {
        await loadWeekFromSupabase();
    }
);


/* =========================================================
   ESC
   ========================================================= */

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


/* =========================================================
   AZIONI MOBILE
   ========================================================= */

document.addEventListener(
    "click",
    (event) => {
        if (
            !event.target.closest(
                ".meal"
            )
        ) {
            meals.forEach((meal) => {
                meal.classList.remove(
                    "mobile-actions-visible"
                );
            });
        }
    }
);


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {
    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(value);

    return div.innerHTML;
}


/* =========================================================
   TEST SUPABASE
   ========================================================= */

async function testSupabase() {
    const {
        error
    } = await supabaseClient
        .from("meals")
        .select("id")
        .limit(1);

    if (error) {
        console.error(
            "Errore collegamento Supabase:",
            error
        );

        return false;
    }

    console.log(
        "✅ Supabase collegato correttamente"
    );

    return true;
}


/* =========================================================
   AVVIO
   ========================================================= */

async function init() {
    migrateOldMeals();

    updateWeekDisplay();

    const connected =
        await testSupabase();

    if (!connected) {
        console.error(
            "❌ Supabase non disponibile."
        );

        return;
    }

    await getCurrentUser();

    /*
       Se l'utente è già autenticato,
       importiamo eventuali dati locali
       e poi carichiamo il database.
    */

    if (currentUser) {
        await migrateLocalDataToSupabase();
    }

    await loadWeekFromSupabase();

    setupRealtime();

    console.log(
        currentUser
            ? "👤 Utente autenticato"
            : "👀 Modalità visualizzazione pubblica"
    );
}


init();