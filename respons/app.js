import { birthAddon, bookPages, bookSizes, bookTemplateVersion, createDraft, elliExample, elliExampleProject, followUp, lastWeeksPhotoSlots, meetingAddon, products, occasions, originalBookFields, originalBookPageCount, originalPregnancyBook, pageOptions, parentsPhotoAddon, photoPagePrices, photoPageSlots, pregnancy, pregnancyGallerySlots, pregnancyGift, pregnancyMomPhotoSlot, pregnancyPdfPrice, predictionPhotoSlots, questions, readyPhotoSlots, recommend, sample } from './story.js';

const home = document.querySelector('#home');
const work = document.querySelector('#work');
const projectSave = document.querySelector('#project-save');
const saveConfirmation = document.querySelector('#save-confirmation');
const photoPageButton = document.querySelector('#add-photo-page');
const questionsButton = document.querySelector('#book-questions');
let questionReturn;
let currentProjectStage;
let beforeProjectSave;
let previewState;
const panel = document.querySelector('#panel');
const step = document.querySelector('#step');
const status = document.querySelector('#status');
const formats = document.querySelector('#formats');
const money = amount => new Intl.NumberFormat('nb-NO').format(amount) + ' kr';

let answers = [];
let index = 0;
let draft = '';
let format = 'pdf';
let bookSize = null;
const chosenSize = () => bookSizes[bookSize];
const pregnancyPrice = (id, size = bookSizes.standard) =>
  ({ pdf: pregnancyPdfPrice, soft: size.softcoverPrice, hard: size.hardcoverPrice })[id];
const productPrice = id => isPregnancy() ? pregnancyPrice(id, chosenSize()) : products[id].price;
const sizeLabel = id => id !== 'pdf' && chosenSize() ? chosenSize().label + ' · ' + chosenSize().dimensions : '';
let exampleMode = false;
let occasion = null;
let projectId = null;
let extraPages = 0;
let photos = [];
let photoPages = [];
let bookFields = {};
let textPlacement = {};
let fieldIndex = 0;
const fillsOriginalBook = () => isPregnancy() && pregnancyPerspective() === pregnancyGift;
let draftSource = 'local';

const isPregnancy = () => occasion?.name === pregnancy.name;
const pregnancyPerspective = () => occasion?.perspective === 'gift' ? pregnancyGift : pregnancy;
const includedPages = () => isPregnancy() ? originalBookPageCount : 26;
const hasMeetingAddon = () => fillsOriginalBook() && bookFields.meetingAddon === 'yes';
const hasParentsPhotoAddon = () => isPregnancy() && bookFields.parentsPhotoAddon === 'yes';
const hasBirthAddon = () => isPregnancy() && bookFields.birthAddon === 'yes';
const activePhotoPages = () => photoPages.filter(({ after }) =>
  (!birthAddon.art.includes(after) || hasBirthAddon()) &&
  (!meetingAddon.art.includes(after) || hasMeetingAddon()) &&
  (after !== parentsPhotoAddon.art || hasParentsPhotoAddon()));
const fixedExtraPages = () => activePhotoPages().length + (hasMeetingAddon() ? meetingAddon.pages : 0) +
  (hasParentsPhotoAddon() ? parentsPhotoAddon.pages : 0) + (hasBirthAddon() ? birthAddon.pages : 0);
const selectedExtraPages = () => isPregnancy() ? fixedExtraPages() : extraPages;
const pagePrice = () => isPregnancy()
  ? (hasMeetingAddon() ? meetingAddon.price : 0) +
    (hasParentsPhotoAddon() ? parentsPhotoAddon.price : 0) + (hasBirthAddon() ? birthAddon.price : 0) +
    activePhotoPages().reduce((total, page) => total + photoPagePrices[page.count], 0)
  : pageOptions[extraPages].price;
const extraPrompts = () => pageOptions[extraPages].prompts;
const questionOrder = () => [0, 1, 2, ...extraPrompts().map((_, i) => 5 + i), 3, 4];

const siteMenu = document.querySelector('#site-menu');
const menuToggle = document.querySelector('#menu-toggle');
const count = document.querySelector('#cart-count');
function load(key) {
  try {
    return JSON.parse(localStorage.getItem('respons-' + key)) ?? [];
  } catch {
    return [];
  }
}
let cart = load('cart');

function save(key, data) {
  try {
    localStorage.setItem('respons-' + key, JSON.stringify(data));
    return true;
  } catch {
    status.textContent = 'Nettleseren kunne ikke lagre endringene til neste besøk.';
    return false;
  }
}

function showWork() {
  home.hidden = true;
  formats.hidden = true;
  work.hidden = false;
}

function showHome() {
  work.hidden = true;
  home.hidden = false;
  formats.hidden = false;
  if (!formats.querySelector('.book-stage').childElementCount) {
    showBookPreview('Elli sin minnebok', elliExample(), formats);
  }
}

function localProjects(mode, operation) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('respons-prosjekter', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('prosjekter', { keyPath: 'projectId' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('prosjekter', mode);
      const result = operation(transaction.objectStore('prosjekter'));
      transaction.oncomplete = () => { database.close(); resolve(result.result); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    };
  });
}

async function saveProject(stage) {
  projectId ??= crypto.randomUUID();
  const project = { projectId, answers: [...answers], index, draft, format, bookSize, exampleMode, occasion, stage, extraPages,
    photos: [...photos], photoPages: [...photoPages], draftSource, bookFields: { ...bookFields }, textPlacement: { ...textPlacement }, fieldIndex, templateVersion: bookTemplateVersion,
    updatedAt: Date.now(), preview: stage === 'preview' ? { ...previewState } : undefined };
  await localProjects('readwrite', store => store.put(project));
}

function openProject(project) {
  questionReturn = undefined;
  ({ projectId, index, draft, format, exampleMode, occasion } = project);
  bookSize = project.bookSize ?? null;
  answers = [...project.answers];
  bookFields = { ...project.bookFields };
  textPlacement = { ...project.textPlacement };
  photoPages = [...(project.photoPages ?? [])];
  fieldIndex = project.templateVersion >= 16 ? (project.fieldIndex ?? 0) : 0;
  if (project.templateVersion === 7) {
    const oldIndex = project.fieldIndex ?? 0;
    const addedPage = originalBookFields.findIndex(field => field.artwork === 11);
    fieldIndex = oldIndex < addedPage ? oldIndex : oldIndex + 4;
  }
  if (project.templateVersion === 7 || project.templateVersion === 8) {
    if (project.templateVersion === 8) fieldIndex = project.fieldIndex ?? 0;
    const predictionsStart = originalBookFields.findIndex(field => field.artwork === 14);
    if (fieldIndex >= predictionsStart) fieldIndex += 8;
  }
  if ([7, 8, 9].includes(project.templateVersion)) {
    if (project.templateVersion === 9) fieldIndex = project.fieldIndex ?? 0;
    const photoPageStart = originalBookFields.findIndex(field => field.artwork === 15);
    if (fieldIndex >= photoPageStart) fieldIndex += 2;
  }
  if ([7, 8, 9, 10].includes(project.templateVersion)) {
    if (project.templateVersion === 10) fieldIndex = project.fieldIndex ?? 0;
    const problemStart = originalBookFields.findIndex(field => field.artwork === 16);
    if (fieldIndex >= problemStart) fieldIndex += originalBookFields.filter(field => field.artwork === 16).length;
  }
  if ([7, 8, 9, 10, 11].includes(project.templateVersion)) {
    if (project.templateVersion === 11) fieldIndex = project.fieldIndex ?? 0;
    const lastWeeksStart = originalBookFields.findIndex(field => field.artwork === 17);
    if (fieldIndex >= lastWeeksStart) fieldIndex += lastWeeksPhotoSlots.length;
  }
  if ([7, 8, 9, 10, 11, 12].includes(project.templateVersion)) {
    if (project.templateVersion === 12) fieldIndex = project.fieldIndex ?? 0;
    const readyPhotoStart = originalBookFields.findIndex(field => field.artwork === 19);
    if (fieldIndex >= readyPhotoStart) fieldIndex += readyPhotoSlots.length;
  }
  if (project.templateVersion >= 7 && project.templateVersion < 14) {
    if (project.templateVersion === 13) fieldIndex = project.fieldIndex ?? 0;
    const betStart = originalBookFields.findIndex(field => field.artwork === 20);
    if (fieldIndex >= betStart) fieldIndex += originalBookFields.filter(field => field.artwork === 20).length;
  }
  if (project.templateVersion >= 7 && project.templateVersion < 15) {
    if (project.templateVersion === 14) fieldIndex = project.fieldIndex ?? 0;
    const promisesStart = originalBookFields.findIndex(field => field.artwork === 23);
    if (fieldIndex >= promisesStart) fieldIndex = promisesStart;
  }
  if (project.templateVersion === 15) fieldIndex = Math.min(project.fieldIndex ?? 0, lastStandardBookStep);
  if ((project.templateVersion ?? 0) < 2) {
    for (const field of originalBookFields.filter(field => field.symbol === '♥')) {
      const old = Number(bookFields[field.key]);
      if (old >= 1 && old <= 7) bookFields[field.key] = String(Math.round(1 + (old - 1) * 4 / 6));
    }
  }
  extraPages = project.extraPages ?? 0;
  photos = [...(project.photos ?? [])];
  if ((project.templateVersion ?? 0) < 3 && photos.length > 7) {
    photos.splice(7, 0, ...meetingAddon.slots.map(() => null));
  }
  if ((project.templateVersion ?? 0) < 4 && photos.length > 11) photos.splice(11, 0, null, null);
  if ((project.templateVersion ?? 0) < 5 && photos.length > 13) photos.splice(13, 0, null);
  if ((project.templateVersion ?? 0) < 6 && photos.length > 14) photos.splice(14, 0, null);
  if ((project.templateVersion ?? 0) < 7 && photos.length > 15) photos.splice(15, 0, null, null, null);
  if ((project.templateVersion ?? 0) < 10 && photos.length > 18) photos.splice(18, 0, null);
  if ((project.templateVersion ?? 0) < 12 && photos.length > 19) photos.splice(19, 0, null, null, null);
  if ((project.templateVersion ?? 0) < 13 && photos.length > 22) photos.splice(22, 0, null);
  if ((project.templateVersion ?? 0) < 16 && photos.length > 23) photos.splice(23, 0, ...birthAddon.slots.map(() => null));
  if ((project.templateVersion ?? 0) < 17) {
    const legacyExtras = photos.splice(27);
    legacyExtras.forEach((photo, i) => { if (photo) photos[27 + i * 5] = photo; });
  }
  draftSource = project.draftSource ?? 'local';
  showWork();
  if (project.stage === 'preview' && project.preview) summary(project.preview.addition, project.preview.spread);
  else if (project.stage === 'format') chooseFormat();
  else if (project.stage === 'draft') edit();
  else if (isPregnancy() && (project.stage === 'pages' || (project.stage === 'interview' && index >= 5))) addPhotos();
  else if (project.stage === 'pages') offerPages();
  else if (project.stage === 'photos') addPhotos();
  else if (project.stage === 'intro') showAlmaIntro();
  else if (project.stage === 'book-fields') fillBookField();
  else if (project.stage === 'birth-addon') offerBirthAddon();
  else if (project.stage === 'meeting-addon') offerMeetingAddon();
  else if (project.stage === 'parents-photo-addon') {
    fieldIndex = hasParentsPhotoAddon() ? parentsPhotoStart : quickStart;
    fillBookField();
  }
  else interview();
}

function updateCart() {
  count.hidden = !cart.length;
  count.textContent = cart.length;
  document.querySelector('#cart').ariaLabel = cart.length ? 'Handlevogn, ' + cart.length + ' varer' : 'Handlevogn';
}

const assistant = '<div class="assistant-id"><span class="assistant-mark" aria-hidden="true">✦</span><div><strong>Alma</strong><small>Respons sin bokassistent</small></div></div>';

function choosePregnancy() {
  showWork();
  view('', `
    <article id="bok0" class="pregnancy-product">
      <div class="pregnancy-picker">
        <div class="product-art">
          <div class="pregnancy-art" role="img" aria-label="Omslaget til Deg, gjennom våre øyne. Bok 0, før vi møtte deg."></div>
        </div>
        <div class="product-intro">
          <p class="eyebrow">Bok 0</p>
          <h2>Deg, gjennom våre øyne</h2>
          <p class="product-subtitle">Før vi møtte deg</p>
          <p class="product-lead">En dag kan barnet bla i denne boka og lese om hvem dere var før dere møttes. Om dagen du fikk nyheten, hvem dere trodde den lille ville ligne på, og alt du gledet deg til.</p>
          <p class="product-facts">24 sider inkludert <span aria-hidden="true">·</span> Egne ord og bilder</p>
          <dl class="product-prices" aria-label="Fra-priser per format">
            ${Object.entries(products).map(([id, product]) => `
              <div><dt>${product.label}</dt><dd><span>fra</span> <strong>${money(pregnancyPrice(id, bookSizes.small))}</strong></dd></div>`).join('')}
          </dl>
          <div class="actions">
            <button class="start-bok0">Lag min minnebok</button>
            <button id="see-bok0" class="secondary">Bla i eksempelboka</button>
          </div>
          <a class="product-example-link" href="#eksempel-elli">Se en ferdig utfylt bok <span aria-hidden="true">↗</span></a>
        </div>
      </div>

      <section class="product-section" id="bok0-innhold" aria-labelledby="bok0-innhold-title">
        <h3 id="bok0-innhold-title">Hva får plass i boka?</h3>
        <div class="product-details">
          <div><h4>Da du fikk vite det</h4><p>Hvor var du, hvem fortalte du det til, og hva husker du fra dagen?</p></div>
          <div><h4>Mens du ventet</h4><p>Fortell om forberedelsene og de små øyeblikkene. Legg inn bilder fra denne tiden.</p></div>
          <div><h4>Et brev til barnet</h4><p>Skriv det du håper barnet skal få vite når det en dag leser boka.</p></div>
        </div>
      </section>

      <section class="product-section" aria-labelledby="bok0-for-hvem">
        <h3 id="bok0-for-hvem">Hvem kan lage boka?</h3>
        <div class="product-details product-audiences">
          <div><h4>Du som er forelder</h4><p>Skriv til barnet ditt om hvordan det var å vente på akkurat dem. Ta med bilder fra graviditeten, de små forberedelsene og ordene du vil at barnet skal få lese en dag.</p></div>
          <div><h4>Du som står familien nær</h4><p>Lag en personlig gave som besteforelder, tante, onkel eller venn. Fortell hvordan du opplevde ventetiden og hva du gledet deg til å dele med den lille.</p></div>
        </div>
      </section>

      <section class="product-section" id="bok0-excerpt" aria-labelledby="bok0-excerpt-title" hidden>
        <h3 id="bok0-excerpt-title" tabindex="-1">Bla i en eksempelbok</h3>
        <p class="hint">Se det nyeste designet med 24 innsider, fra perspektivet til en som står familien nær.</p>
        ${bookViewerMarkup()}
      </section>

      <section class="product-section" aria-labelledby="bok0-process">
        <h3 id="bok0-process" tabindex="-1">Slik lager du boka</h3>
        <ol class="product-details process-list">
          <li><h4>Fortell litt om gangen</h4><p>Alma stiller spørsmål side for side og gir eksempler hvis du står fast. Du kan hoppe over det du vil ta senere.</p></li>
          <li><h4>Legg inn bildene som hører til</h4><p>Velg bilder fra ventetiden og legg til flere bildesider hvis du vil gi minnene mer plass.</p></li>
          <li><h4>Bla gjennom boka di</h4><p>Les teksten, rett det du vil og juster bildene i rammene. Du ser prisen med valgte tillegg i prisoversikten.</p></li>
        </ol>
        <div class="actions"><button class="start-bok0">Lag min minnebok</button></div>
      </section>

    </article>`);
  work.classList.add('product-work');

  for (const button of panel.querySelectorAll('.start-bok0')) {
    button.onclick = () => { location.hash = 'bok0-avsender'; };
  }

  const excerpt = panel.querySelector('#bok0-excerpt');
  const seeBook = panel.querySelector('#see-bok0');
  seeBook.setAttribute('aria-controls', excerpt.id);
  seeBook.setAttribute('aria-expanded', 'false');
  seeBook.onclick = () => {
    if (excerpt.hidden) {
      excerpt.hidden = false;
      showBookPreview(pregnancy.bookTitle, originalPregnancyBook());
      seeBook.setAttribute('aria-expanded', 'true');
    }
    const title = excerpt.querySelector('h3');
    title.focus({ preventScroll: true });
    title.scrollIntoView({ block: 'start' });
  };
}

function chooseBookSender() {
  showWork();
  view('Før vi møtte deg', `
    <section class="product-choice">
      <h2>Hvem er boka fra?</h2>
      <p>Alma tilpasser spørsmålene til din rolle i barnets historie.</p>
      <div class="pregnancy-choices">
        <button id="own-child" aria-labelledby="own-child-title" aria-describedby="own-child-description"><span id="own-child-title">Fra meg som forelder</span><small id="own-child-description">Fortell barnet hvordan du opplevde ventetiden.</small></button>
        <button id="gift-child" class="secondary" aria-labelledby="gift-child-title" aria-describedby="gift-child-description"><span id="gift-child-title">Fra meg som står familien nær</span><small id="gift-child-description">Gi barnet dine minner fra før dere møttes.</small></button>
      </div>
      <button id="back" class="secondary">Tilbake til boka</button>
    </section>`);
  panel.querySelector('#own-child').onclick = () => chooseBookOptions((size, selectedFormat) => begin(false, pregnancy, size, selectedFormat), chooseBookSender);
  panel.querySelector('#gift-child').onclick = () => chooseBookOptions((size, selectedFormat) => begin(false, pregnancyGift, size, selectedFormat), chooseBookSender);
  panel.querySelector('#back').onclick = showBok0;
}

function chooseBookOptions(onSelect, goBack, selected = 'standard', selectedFormat = 'hard', buttonLabel = 'Fortsett til Alma') {
  const sizes = Object.entries(bookSizes);
  view('Bok 0', `
    <h2>Velg format og størrelse</h2>
    <p class="hint">Velg digital PDF, mykt omslag (softcover) eller stivt omslag (hardcover). Trykte bøker kommer i tre størrelser.</p>
    <form class="size-picker">
      <fieldset><legend>Bokformat</legend>
        ${Object.entries(products).map(([id, item]) => `<label><input type="radio" name="format" value="${id}" ${id === selectedFormat ? 'checked' : ''}> ${item.label}</label>`).join('')}
      </fieldset>
      <div id="print-sizes">
    <div class="size-comparison" aria-hidden="true">
      ${sizes.map(([id, size]) => `<div class="size-sample">
        <div class="size-cover-stage">
          <div class="pregnancy-art size-cover" data-art-page="1" style="width:${size.width * 100 / 21}%;aspect-ratio:${size.width}/${size.height}"></div>
        </div>
        <strong>${size.label}</strong><span>${size.dimensions}</span>
      </div>`).join('')}
    </div>
      <fieldset><legend>Størrelse</legend>
        ${sizes.map(([id, size]) => `<label class="size-option">
          <input type="radio" name="size" value="${id}" ${id === selected ? 'checked' : ''}>
          <span><strong>${size.label}</strong><small>${size.type} · ${size.dimensions}</small></span>
          <span class="size-price">fra ${money(pregnancyPrice(selectedFormat, size))}</span>
        </label>`).join('')}
      </fieldset>
      <p class="hint">Målene er foreløpige.</p>
      </div>
      <p id="starting-price" aria-live="polite"></p>
      <div class="actions">
        <button>${buttonLabel}</button>
        <button id="back" type="button" class="secondary">Tilbake</button>
      </div>
    </form>`);
  const form = panel.querySelector('form');
  const formatChoice = () => form.elements.format.value;
  const sizeChoice = () => form.elements.size.value;
  function updateOptions() {
    const selectedFormat = formatChoice();
    const printed = selectedFormat !== 'pdf';
    panel.querySelector('#print-sizes').hidden = !printed;
    form.querySelectorAll('input[name="size"]').forEach(input => {
      input.disabled = !printed;
      if (printed) input.closest('label').querySelector('.size-price').textContent =
        'fra ' + money(pregnancyPrice(selectedFormat, bookSizes[input.value]));
    });
    const price = pregnancyPrice(selectedFormat, bookSizes[sizeChoice()]);
    panel.querySelector('#starting-price').textContent = products[selectedFormat].label + ' · fra ' + money(price);
  }
  form.onchange = updateOptions;
  form.onsubmit = event => {
    event.preventDefault();
    onSelect(formatChoice() === 'pdf' ? null : sizeChoice(), formatChoice());
  };
  updateOptions();
  panel.querySelector('#back').onclick = goBack;
}

function begin(withExample, category = null, size = null, selectedFormat = 'pdf', setup = null) {
  questionReturn = undefined;
  occasion = category;
  projectId = null;
  extraPages = 0;
  photos = [];
  photoPages = setup?.photoPages.map(({ after, count }) => ({ after, count })) ?? [];
  bookFields = setup ? {
    meetingAddon: setup.bookFields.meetingAddon,
    birthAddon: setup.bookFields.birthAddon,
    purchaseAddition: setup.preview.addition?.label
  } : {};
  textPlacement = {};
  fieldIndex = 0;
  draftSource = 'local';
  answers = withExample ? [...sample] : [];
  exampleMode = withExample;
  index = 0;
  draft = '';
  bookSize = size;
  format = selectedFormat;
  showWork();
  if (isPregnancy()) showAlmaIntro();
  else interview();
}

function showAlmaIntro() {
  projectView('intro', 'Bok 0 · Kom i gang', `
    <section class="conversation alma-intro">
      ${assistant}
      <div class="assistant-message">
        <h2>Hei, jeg heter Alma</h2>
        <p>Jeg hjelper deg å lage <em>Før vi møtte deg</em>, en bok til barnet om tiden før dere møttes.</p>
        ${hasMeetingAddon() && hasBirthAddon() && photoPages.length ? '<p>Format og tillegg er valgt som i boka til Elli. Nå fyller du inn dine egne minner og bilder.</p>' : ''}
      </div>
      <ol class="alma-intro-steps">
        <li><strong>Svar side for side</strong><span>Jeg viser deg spørsmålene som hører til den aktuelle boksiden. Hopp over det du vil ta senere. Du finner sidene igjen i spørsmålsoversikten.</span></li>
        <li><strong>Legg inn dine egne bilder</strong><span>Når en side har bilderammer, viser jeg deg hvor du kan legge inn et bilde. Underveis kan du også velge ekstra sider.</span></li>
        <li><strong>Bla i boka og gjør den til din</strong><span>I forhåndsvisningen kan du rette tekst, flytte bilder og justere utsnittet. Bruk «Lagre prosjekt» når du vil fortsette senere.</span></li>
      </ol>
      <div class="actions">
        <button id="start-book-interview">Begynn på side 1</button>
        <button id="back" class="secondary">Tilbake til format og størrelse</button>
      </div>
    </section>`);
  panel.querySelector('#start-book-interview').onclick = () => {
    fieldIndex = 0;
    fillBookField();
  };
  panel.querySelector('#back').onclick = () => chooseBookOptions((size, selectedFormat) => {
    bookSize = size;
    format = selectedFormat;
    showAlmaIntro();
  }, showAlmaIntro, bookSize ?? 'standard', format);
}

function projectView(stage, label, markup) {
  view(label, markup);
  currentProjectStage = stage;
  projectSave.hidden = false;
  questionsButton.hidden = !isPregnancy();
}

const saveProjectButton = document.querySelector('#save-project');

async function saveCurrentProject() {
  saveConfirmation.textContent = '';
  if (beforeProjectSave && !beforeProjectSave()) return;
  saveProjectButton.disabled = true;
  try {
    await saveProject(currentProjectStage);
    saveConfirmation.textContent = 'Lagret i nettleseren. Fortsett under Mine prosjekter.';
  } catch {
    saveConfirmation.textContent = 'Prosjektet ble ikke lagret i nettleseren. Du kan prøve igjen.';
  } finally {
    saveProjectButton.disabled = false;
  }
}

saveProjectButton.onclick = saveCurrentProject;

function view(label, markup) {
  projectSave.hidden = true;
  questionsButton.hidden = true;
  photoPageButton.hidden = true;
  saveConfirmation.textContent = '';
  currentProjectStage = undefined;
  beforeProjectSave = undefined;
  work.classList.remove('wide-book', 'product-work');
  status.textContent = '';
  step.textContent = label;
  panel.innerHTML = markup;
  step.hidden = !label;
  const heading = panel.querySelector('h2');
  heading.tabIndex = -1;
  heading.focus();
}

const bookStepStarts = originalBookFields.flatMap((field, i) =>
  originalBookFields[i - 1]?.artwork === field.artwork ? [] : [i]);

const parentsMetStart = originalBookFields.findIndex(field => field.artwork === 5);
const parentsPhotoStart = originalBookFields.findIndex(field => field.artwork === parentsPhotoAddon.art);
const quickStart = originalBookFields.findIndex(field => field.artwork === 6);
const meetingStart = originalBookFields.findIndex(field => field.artwork === meetingAddon.art[0]);
const meetingEnd = originalBookFields.findIndex(field => field.artwork === 7);
const lastStandardBookStep = originalBookFields.findIndex(field => field.key === 'letter');
const birthAddonStart = lastStandardBookStep + 1;
const lastBookStep = bookStepStarts.at(-1);
const bookPageTitles = {
  2: 'Hvem er denne boken til og fra, og hvorfor har du laget boken?',
  3: 'Mamma før hun ble mamma', 4: 'Pappa før han ble pappa',
  5: 'Hvordan foreldrene møttes', 6: 'Foreldrene dine i 10 raske',
  7: 'Dagen vi fikk vite om deg', 8: 'Det første bildet', 9: 'Hvordan mamma hadde det', 10: 'Har du kanskje noen bilder av mamma i graviditeten?',
  11: 'Slik så foreldrene dine seg som foreldre',
  12: 'Hvem ligner barnet på?', 13: 'Mamma eller pappa?', 14: 'Våre spådommer', 15: 'Har du to bilder fra ventetiden?',
  16: 'Dette kommer til å bli et problem', 17: 'Den siste tiden i bilder', 18: 'Hvor klare er foreldrene?',
  19: 'To minner fra forberedelsene', 20: 'Det store veddemålet', 21: 'Dette har vi bestemt oss for å lære deg!', 22: 'Våre siste råd til foreldrene', 23: 'Dette lover vi deg', 24: 'Kjære deg, i dag …',
  27: 'Hvordan møttes vi?', 28: 'Bilder fra den tiden', 29: 'Et bilde av foreldrene sammen',
  30: 'Kjære foreldre, i dag …', 31: 'Velkommen til verden', 32: 'Bilder vi vil ta vare på', 33: 'Flere bilder til boka'
};

function bookPageNumber(artwork) {
  if (photoPages.length) {
    const position = originalPregnancyBook('', [], [], bookFields, {}, photoPages)
      .findIndex(page => page.artwork === artwork);
    if (position >= 0) return position + 1;
  }
  const photoOffset = hasParentsPhotoAddon() ? 1 : 0;
  if (birthAddon.art.includes(artwork)) return 24 + photoOffset + (hasMeetingAddon() ? meetingAddon.pages : 0) + birthAddon.art.indexOf(artwork);
  if (artwork === parentsPhotoAddon.art) return 5;
  if (meetingAddon.art.includes(artwork)) return 6 + photoOffset + meetingAddon.art.indexOf(artwork);
  return artwork - 1 + (artwork >= 6 ? photoOffset : 0) + (hasMeetingAddon() && artwork >= 7 ? meetingAddon.pages : 0);
}

function showBookQuestions() {
  if (beforeProjectSave && !beforeProjectSave()) return;
  if (!questionReturn) {
    const from = currentProjectStage;
    const previousField = fieldIndex;
    const previousIndex = index;
    const preview = previewState;
    questionReturn = () => {
      fieldIndex = previousField;
      index = previousIndex;
      const routes = {
        intro: showAlmaIntro, 'book-fields': fillBookField, 'meeting-addon': offerMeetingAddon,
        'birth-addon': offerBirthAddon, interview, pages: offerPages,
        photos: addPhotos, draft: edit, format: chooseFormat, preview: () => summary(preview?.addition, preview?.spread)
      };
      (routes[from] ?? fillBookField)();
    };
  }
  view('', `
    <h2>Spørsmålsoversikt</h2>
    <p class="hint">Åpne en side for å fylle inn det du vil. Du kan la feltene stå tomme.</p>
    <div id="question-pages" class="saved-items"></div>
    <div class="actions"><button id="leave-questions">Tilbake til der du var</button></div>`);
  const list = panel.querySelector('#question-pages');
  for (const [step, start] of bookStepStarts.entries()) {
    const { artwork } = originalBookFields[start];
    if (start >= birthAddonStart && !hasBirthAddon()) continue;
    if (start === parentsPhotoStart && !hasParentsPhotoAddon()) continue;
    if (start >= meetingStart && start < meetingEnd && !hasMeetingAddon()) continue;
    const fields = originalBookFields.slice(start, bookStepStarts[step + 1] ?? originalBookFields.length);
    const count = fields.filter(field => field.slot !== undefined ? photos[field.slot] : bookFields[field.key]?.trim()).length;
    const button = document.createElement('button');
    button.className = 'secondary';
    button.textContent = ('Side ' + bookPageNumber(artwork) + ' · ') + bookPageTitles[artwork];
    const detail = document.createElement('small');
    detail.textContent = count === fields.length ? 'Utfylt' : count ? 'Påbegynt' : 'Ikke utfylt';
    button.append(detail);
    button.onclick = () => {
      fieldIndex = start;
      fillBookField();
    };
    list.append(button);
  }
  panel.querySelector('#leave-questions').onclick = () => {
    const returnToPrevious = questionReturn;
    questionReturn = undefined;
    returnToPrevious();
  };
}
questionsButton.onclick = showBookQuestions;

function offerMeetingAddon() {
  fieldIndex = meetingStart;
  projectView('meeting-addon', 'Et ekstra oppslag', `
    <section class="conversation">
      ${assistant}
      <div class="assistant-message">
        <h2>Vil du fortelle hvordan du ble kjent med foreldrene?</h2>
        <p>${hasMeetingAddon() ? 'Oppslaget er allerede lagt til i bokvalget ditt.' : 'For 25 kr ekstra får du oppslaget «Hvordan møttes vi?».'} Jeg stiller tre spørsmål om hvordan dere ble kjent, og du får plass til opptil fire bilder.</p>
      </div>
      <div class="actions">
        <button id="accept-meeting">${hasMeetingAddon() ? 'Fortsett med oppslaget' : 'Legg til oppslaget · 25 kr'}</button>
        <button class="secondary" id="decline-meeting">Fortsett uten tillegg</button>
        <button class="secondary" id="back">Tilbake</button>
      </div>
    </section>`);
  panel.querySelector('#accept-meeting').onclick = () => {
    bookFields.meetingAddon = 'yes';
    fillBookField();
  };
  panel.querySelector('#decline-meeting').onclick = () => {
    bookFields.meetingAddon = 'no';
    fieldIndex = meetingEnd;
    fillBookField();
  };
  panel.querySelector('#back').onclick = () => {
    fieldIndex = quickStart;
    fillBookField();
  };
}

const letterWordLimit = 160;
const questionWordLimit = 60;
const countWords = value => value.trim().split(/\s+/u).filter(Boolean).length;

function limitForBookField(field) {
  if (field.key === 'letter') return letterWordLimit;
  if (field.key.endsWith('-ord')) return 3;
  if (field.key === 'til' || field.key === 'fra') return 6;
  if (field.key === 'first-date') return 3;
  if (field.key === 'mamma-minne' || field.key === 'pappa-minne') return 60;
  if (field.key === 'fordi') return 50;
  if (field.key === 'mettes') return 150;
  if (field.key.startsWith('laere-')) return 10;
  if (field.key.startsWith('raad-')) return 15;
  return Math.max(6, Math.min(75, Math.floor(field.max / 7)));
}

function attachWordLimit(input, max, advisory = false) {
  const counter = document.createElement('small');
  counter.id = input.id + '-word-count';
  counter.className = 'word-counter';
  input.setAttribute('aria-describedby', counter.id);
  input.after(counter);
  function update() {
    const words = countWords(input.value);
    const tooLong = words > max;
    counter.textContent = advisory ? words + ' ord · Anbefalt ca. ' + max + ' ord' :
      tooLong ? (words - max) + ' ord for mye. Maks ' + max + ' ord.' : words + ' / ' + max + ' ord';
    counter.classList.toggle('over-limit', tooLong && !advisory);
    if (!advisory) input.setCustomValidity(tooLong ? 'Bruk maks ' + max + ' ord i dette feltet.' : '');
  }
  input.addEventListener('input', update);
  update();
}

function fillBookField() {
  const stepIndex = bookStepStarts.findLastIndex(start => start <= fieldIndex);
  fieldIndex = bookStepStarts[stepIndex];
  const nextIndex = bookStepStarts[stepIndex + 1] ?? originalBookFields.length;
  const fields = originalBookFields.slice(fieldIndex, nextIndex);
  const { artwork } = fields[0];
  const title = bookPageTitles[artwork];
  const withChoices = fields.some(field => field.options);
  const guidance = artwork === 21 ? 'Hva har du lyst til å lære barnet? Det kan være en praktisk ferdighet, et livsråd eller noe dere kan ha det gøy med sammen. Skriv én kort ting per felt. Du kan fylle inn så mange av de ti punktene du vil.' :
    artwork === 22 ? 'Nå skal vi gi foreldrene noen siste råd før barnet kommer. Tenk på hva som kan gjøre en vanlig dag litt lettere, eller hva du selv hadde likt å høre. Fullfør de setningene du vil svare på.' :
    artwork === 9 ? 'Hvordan var ventetiden for mamma? Tenk på alt fra mat hun plutselig elsket til øyeblikk hun husker ekstra godt. Du kan hoppe over det du ikke vet eller som føles privat.' :
    artwork === 10 ? 'Legg inn opptil fire bilder. Et magebilde, et feriebilde eller et helt vanlig øyeblikk hjemme kan passe fint.' :
    artwork === 11 ? 'Hva så foreldrene for seg før barnet kom? Ta utgangspunkt i noe de faktisk fortalte eller snakket om. Hvis du er usikker, kan du la feltet stå tomt.' :
    artwork === 14 ? 'Almas krystallkule er litt duggete i dag, så her trenger jeg dine beste gjetninger. Hva tror du barnet sier, spiser eller finner på for første gang?' :
    artwork === 15 ? 'Kanskje du har et bilde fra en dag dere gledet dere ekstra, eller fra et helt vanlig øyeblikk du vil huske? Legg til ett eller to bilder hvis du har.' :
    artwork === 16 ? 'Tenk på vanene dere allerede ler av rundt middagsbordet. Hva hvis den lille arver akkurat dem?' :
    artwork === 17 ? 'Har du noen bilder fra de siste ukene før barnet kom? Kanskje fødebagen sto klar, noen holdt en hånd på magen, eller du har et bilde fra en helt vanlig dag dere vil huske. Legg inn opptil fire bilder.' :
    artwork === 18 ? '1 er «Ikke i nærheten». 5 er «Mer enn klar».' :
    artwork === 19 ? 'Har du et bilde av noe dere gjorde klart mens dere ventet? Kanskje den første lille bodyen, vogna på prøvetur eller foreldrene sammen. Her er det plass til to bilder.' :
    artwork === 20 ? 'Alma åpner familiens tippekonkurranse! Premien er retten til å si «Hva var det jeg sa?» når fasiten kommer. Tipp så mye du vil.' :
    artwork === 23 ? 'Hva har du lyst til å love den lille? Det kan være å stille opp på en vanskelig dag eller å danse på kjøkkenet selv om ingen finner takta. Skriv ett kort løfte per linje, så mange du vil.' :
    artwork === 24 ? 'Nå har du kommet til den siste hilsenen. Skriv direkte til barnet, som om det skal åpne boka mange år fra nå. Begynn gjerne med én liten ting fra i dag. Hva tenkte du på, og hva håper du barnet skal vite om tiden før dere møttes?' :
    artwork === 30 ? 'Hva håper du foreldrene får lese akkurat når de trenger det? Skriv gjerne om et lite øyeblikk fra ventetiden eller noe du beundrer ved dem.' :
    artwork === 31 ? 'Når barnet har kommet til verden, kan du fylle inn de første detaljene her. Du kan la hele skjemaet stå tomt til dere vet mer.' :
    artwork === 32 || artwork === 33 ? 'Her er det plass til to bilder. Velg gjerne et bilde fra graviditeten, et gruppebilde med foreldrene, et gammelt blinkskudd eller et øyeblikk med den lille. Du kan legge inn bilder nå eller komme tilbake senere.' :
    withChoices ? 'Kryss av på det du vil svare på.' :
    artwork === 3 || artwork === 4 ? 'Skriv en kort beskrivelse, tre ord og legg til bilder hvis du har.' :
    '';
  const imageFields = fields.filter(field => field.slot !== undefined);
  const textFields = fields.filter(field => field.slot === undefined);

  projectView('book-fields', 'Bok 0 · Side ' + bookPageNumber(artwork), `
    <section class="conversation book-quiz">
      ${assistant}
      <div class="assistant-message">${artwork === 14 ? '<span class="prediction-mark" aria-hidden="true">✦</span>' : ''}<h2>${title}</h2>
        ${guidance ? `<p>${guidance}</p>` : ''}</div>
      <form>
        ${fields.some(field => field.example) ? '<button type="button" id="toggle-field-examples" class="secondary" aria-pressed="true">Skjul eksempler</button>' : ''}
        <div id="field-control" class="book-quiz-group"></div>
        <div id="field-images" class="book-field-images" hidden></div>
        <div class="actions">
          <button>Neste side</button>
          <button type="button" class="secondary" id="skip-book-page">Hopp over siden</button>
          ${questionReturn ? '<button type="button" class="secondary" id="back-to-questions">Til spørsmålsoversikten</button>' : ''}
          <button type="button" class="secondary" id="back">Tilbake</button>
        </div>
      </form>
    </section>`);
  photoPageButton.hidden = false;
  photoPageButton.onclick = () => offerPhotoPage(artwork);
  const form = panel.querySelector('form');
  const controls = panel.querySelector('#field-control');
  for (const field of textFields) {
    if (field.section) {
      const heading = document.createElement('h3');
      heading.className = 'book-field-heading';
      heading.textContent = field.section;
      controls.append(heading);
    }
    if (field.options) {
      const options = document.createElement('fieldset');
      options.className = 'book-quiz-options';
      const legend = document.createElement('legend');
      legend.textContent = field.question;
      options.append(legend);
      for (const option of field.options) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = field.key;
        input.value = option;
        input.checked = bookFields[field.key] === option;
        input.onchange = () => { bookFields[field.key] = option; };
        label.append(input, ' ' + option);
        options.append(label);
      }
      controls.append(options);
      continue;
    }
    if (field.key.endsWith('-ord')) {
      const words = (bookFields[field.key] ?? '').split(/\n|,\s*/).slice(0, 3);
      const group = document.createElement('fieldset');
      group.className = 'book-three-words';
      const legend = document.createElement('legend');
      legend.textContent = field.question;
      group.append(legend);
      const inputs = Array.from({ length: 3 }, (_, i) => {
        const input = document.createElement('input');
        input.id = field.key + '-' + (i + 1);
        input.setAttribute('aria-label', 'Ord ' + (i + 1));
        input.placeholder = 'Ord ' + (i + 1);
        input.maxLength = 25;
        input.value = words[i] ?? '';
        group.append(input);
        return input;
      });
      for (const input of inputs) {
        input.oninput = () => {
          const valid = countWords(input.value) <= 1;
          input.setCustomValidity(valid ? '' : 'Skriv ett ord i hvert felt.');
          if (inputs.every(item => countWords(item.value) <= 1)) {
            bookFields[field.key] = inputs.map(item => item.value.trim()).join('\n').trimEnd();
          }
        };
        input.setCustomValidity(countWords(input.value) <= 1 ? '' : 'Skriv ett ord i hvert felt.');
      }
      controls.append(group);
      continue;
    }
    const label = document.createElement('label');
    const input = document.createElement(field.max <= 75 && !field.pitch ? 'input' : 'textarea');
    input.id = 'answer-' + field.key;
    if (field.example) {
      input.dataset.fieldExample = 'F.eks. ' + field.example;
      input.placeholder = input.dataset.fieldExample;
    }
    input.value = bookFields[field.key] ?? '';
    label.htmlFor = input.id;
    label.textContent = field.question;
    input.oninput = () => { bookFields[field.key] = input.value; };
    controls.append(label, input);
    attachWordLimit(input, limitForBookField(field), true);
  }

  const examples = panel.querySelector('#toggle-field-examples');
  if (examples) {
    examples.onclick = () => {
      const visible = examples.getAttribute('aria-pressed') === 'true';
      examples.setAttribute('aria-pressed', String(!visible));
      examples.textContent = visible ? 'Vis eksempler' : 'Skjul eksempler';
      for (const field of controls.querySelectorAll('[data-field-example]')) {
        field.placeholder = visible ? '' : field.dataset.fieldExample;
      }
      for (const hint of form.querySelectorAll('[data-photo-example]')) hint.hidden = visible;
    };
  }

  const imageSection = panel.querySelector('#field-images');
  imageSection.hidden = !imageFields.length;
  if (imageFields.length) {
    const question = document.createElement('h3');
    question.textContent = artwork === 3 ? 'Har du to bilder av mammaen?' :
      artwork === 4 ? 'Har du to bilder av pappaen?' : 'Legg til bilder';
    imageSection.append(question);
    const grid = document.createElement('div');
    grid.className = 'page-photo-inputs';
    imageSection.append(grid);
    let pending = 0;
    const navigation = [...form.querySelectorAll('.actions button')];
    for (const field of imageFields) {
      const card = document.createElement('div');
      const label = document.createElement('label');
      const input = document.createElement('input');
      const preview = document.createElement('div');
      label.textContent = field.question;
      input.id = 'answer-' + field.key;
      label.htmlFor = input.id;
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      card.append(label, input);
      if (field.example) {
        const hint = document.createElement('p');
        hint.className = 'hint photo-field-example';
        hint.dataset.photoExample = '';
        hint.textContent = 'F.eks. ' + field.example;
        card.append(hint);
      }
      card.append(preview);
      grid.append(card);
      function showPhoto() {
        preview.replaceChildren();
        const photo = photos[field.slot];
        if (!photo) return;
        const image = new Image();
        image.src = photo.url;
        image.alt = photo.name;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'secondary';
        remove.textContent = 'Fjern bilde';
        remove.onclick = () => {
          photos[field.slot] = null;
          input.value = '';
          showPhoto();
        };
        preview.append(image, remove);
      }
      showPhoto();
      input.onchange = async () => {
        const [file] = input.files;
        if (!file) return;
        pending++;
        navigation.forEach(button => button.disabled = true);
        input.disabled = true;
        try {
          const photo = await preparePhoto(file);
          if (!input.isConnected) return;
          photos[field.slot] = photo;
          showPhoto();
        } catch (error) {
          if (input.isConnected) status.textContent = error.message;
        } finally {
          pending--;
          input.disabled = false;
          navigation.forEach(button => button.disabled = pending > 0);
        }
      };
    }
  }

  function nextBookPage() {
    fieldIndex = nextIndex;
    if (fieldIndex === birthAddonStart) {
      offerBirthAddon();
      return;
    }
    if (fieldIndex === parentsPhotoStart && !hasParentsPhotoAddon()) fieldIndex = quickStart;
    if (fieldIndex === meetingStart) {
      if (fillsOriginalBook()) {
        offerMeetingAddon();
        return;
      }
      fieldIndex = meetingEnd;
    }
    if (fieldIndex < originalBookFields.length) fillBookField();
    else addPhotos();
  }
  form.onsubmit = event => {
    event.preventDefault();
    nextBookPage();
  };
  panel.querySelector('#skip-book-page').onclick = () => form.requestSubmit();
  const toOverview = panel.querySelector('#back-to-questions');
  if (toOverview) toOverview.onclick = showBookQuestions;
  panel.querySelector('#back').onclick = () => {
    if (fieldIndex === birthAddonStart) offerBirthAddon();
    else if (fieldIndex === 0) showAlmaIntro();
    else if (fieldIndex === quickStart && !hasParentsPhotoAddon()) {
      fieldIndex = parentsMetStart;
      fillBookField();
    }
    else if (fieldIndex === meetingEnd && !fillsOriginalBook()) {
      fieldIndex = quickStart;
      fillBookField();
    } else if (fieldIndex === meetingStart || (fieldIndex === meetingEnd && !hasMeetingAddon())) offerMeetingAddon();
    else {
      fieldIndex = bookStepStarts[stepIndex - 1];
      fillBookField();
    }
  };
}

function interview() {
  if (isPregnancy() && index < 5) {
    fillBookField();
    return;
  }
  const order = questionOrder();
  const position = order.indexOf(index);
  const previousIndex = order[position - 1];
  projectView('interview', (occasion ? occasion.name + ' · ' : '') + 'Spørsmål ' + (position + 1) + ' av ' + order.length, `
    <div class="conversation">
    ${assistant}
    <div id="previous-answer" class="customer-message" hidden></div>
    <div class="assistant-message"><p id="prompt-note" hidden></p><h2 id="question"></h2><p id="question-hint" class="question-hint" hidden></p></div>
    <p class="hint">${exampleMode ? 'Eksempelsvaret er fylt ut. Du kan endre det.' : 'Skriv med dine egne ord. En setning holder.'}</p>
    <form id="interview">
      <label for="answer">Ditt svar</label>
      <textarea id="answer" maxlength="1800" required></textarea>
      <div class="actions">
        <button type="submit">${index === 4 ? 'Fortsett til bilder' : 'Neste spørsmål'}</button>
        <button type="button" class="secondary" id="back">Tilbake</button>
        ${index === 2 || index === 4 || index >= 5 ? '<button type="button" class="secondary" id="skip">Hopp over</button>' : ''}
      </div>
    </form></div>`);
  const previous = panel.querySelector('#previous-answer');
  if (answers[previousIndex]) {
    previous.hidden = false;
    previous.textContent = answers[previousIndex];
  }
  const note = panel.querySelector('#prompt-note');
  if (index === 0 || (index === 2 && !isPregnancy())) {
    note.hidden = false;
    note.textContent = index === 0 ? 'Hei, jeg heter Alma. Jeg hjelper deg å finne minnene som skal få plass i boka.' :
      followUp(answers[1]).slice(0, -(questions[2].length + 1));
  }
  const question = panel.querySelector('#question');
  question.textContent = (isPregnancy() ? pregnancyPerspective().questions : questions)[index] ?? extraPrompts()[index - 5];
  if (index === 1 && occasion?.memory) question.textContent = occasion.memory;
  const hint = pregnancyPerspective().hints[index];
  if (isPregnancy() && hint) {
    const hintElement = panel.querySelector('#question-hint');
    hintElement.textContent = hint;
    hintElement.hidden = false;
    question.setAttribute('aria-describedby', hintElement.id);
  }
  question.focus();
  const answer = panel.querySelector('#answer');
  answer.value = answers[index] ?? '';
  attachWordLimit(answer, questionWordLimit);
  answer.oninput = () => {
    answers[index] = answer.value;
  };
  const advance = value => {
    answers[index] = value;
    if (index === 2) {
      offerPages();
    } else if (index === 4) {
      addPhotos();
    } else {
      index = order[position + 1];
      interview();
    }
  };
  panel.querySelector('form').onsubmit = event => {
    event.preventDefault();
    const value = answer.value.trim();
    if (!value) {
      status.textContent = 'Skriv et kort svar for å gå videre.';
      return;
    }
    advance(value);
  };
  const skip = panel.querySelector('#skip');
  if (skip) skip.onclick = () => advance('');
  panel.querySelector('#back').onclick = () => {
    answers[index] = answer.value;
    if (previousIndex === 2) {
      index = previousIndex;
      offerPages();
    } else if (previousIndex !== undefined) {
      index = previousIndex;
      interview();
    } else {
      if (fillsOriginalBook()) {
        fieldIndex = Math.min(fieldIndex, originalBookFields.length - 1);
        fillBookField();
        return;
      }
      if (isPregnancy()) {
        choosePregnancy();
        return;
      }
      showHome();
      document.querySelector(exampleMode ? '#example' : '#start').focus();
    }
  };
}

function offerPages() {
  if (isPregnancy()) return addPhotos();
  projectView('pages', 'Ekstra plass', `
    <div class="conversation">
      ${assistant}
      <div class="assistant-message">
        <h2>Vil du ha flere sider til historien din?</h2>
        <p>Du har fortalt om et minne som kan få mer plass. Boka har ${includedPages()} sider inkludert. Vil du legge til sider og fortelle litt mer?</p>
      </div>
      <form>
        <fieldset><legend>Velg sidetall</legend>
          ${[0, 4, 8].map(pages => `<label><input name="pages" type="radio" value="${pages}" ${pages === extraPages ? 'checked' : ''}>
          ${pages ? 'Legg til ' + pages + ' sider (+' + money(pageOptions[pages].price) + ')' : 'Behold ' + includedPages() + ' sider'}
          </label>`).join('')}
        </fieldset>
        <div class="actions"><button>Fortsett med Alma</button><button type="button" id="back" class="secondary">Tilbake</button></div>
      </form>
    </div>`);
  const form = panel.querySelector('form');
  form.onsubmit = event => {
    event.preventDefault();
    extraPages = Number(new FormData(form).get('pages'));
    answers.length = Math.min(answers.length, 5 + pageOptions[extraPages].prompts.length);
    index = extraPages ? 5 : 3;
    interview();
  };
  panel.querySelector('#back').onclick = interview;
}

function offerPhotoPage(artwork) {
  const dialog = document.createElement('dialog');
  dialog.className = 'account-dialog';
  dialog.innerHTML = `
    <h2>Vil du legge til bilder på neste side?</h2>
    <p>Velg hvor mange bilder du vil ha på den ekstra siden. Du kan legge dem inn nå eller i forhåndsvisningen.</p>
    <form>
      <fieldset><legend>Bilder på siden</legend>
        ${Object.entries(photoPagePrices).map(([count, price]) => `
          <label><input type="radio" name="count" value="${count}" ${count === '1' ? 'checked' : ''}>
            ${count} ${count === '1' ? 'bilde' : 'bilder'} · ${money(price)}</label>`).join('')}
      </fieldset>
      <div class="actions">
        <button>Legg til bildesiden</button>
        <button type="button" class="secondary">Avbryt</button>
      </div>
    </form>`;
  const form = dialog.querySelector('form');
  dialog.onclose = () => dialog.remove();
  form.querySelector('[type=button]').onclick = () => dialog.close();
  form.onsubmit = event => {
    event.preventDefault();
    const count = Number(form.elements.count.value);
    const heading = dialog.querySelector('h2');
    heading.textContent = 'Velg bilder til den nye siden';
    dialog.querySelector('p').textContent = 'Bildesiden koster ' + money(photoPagePrices[count]) +
      '. Du kan fylle inn så mange rammer du vil nå og legge inn resten i forhåndsvisningen.';
    form.innerHTML = `
      ${Array.from({ length: count }, (_, i) => `
        <label for="extra-page-file-${i}">Bilde ${i + 1}</label>
        <input id="extra-page-file-${i}" type="file" accept="image/jpeg,image/png,image/webp">`).join('')}
      <p role="status"></p>
      <div class="actions">
        <button>Lagre bildesiden · ${money(photoPagePrices[count])}</button>
        <button type="button" class="secondary">Avbryt</button>
      </div>`;
    const inputs = [...form.querySelectorAll('input[type=file]')];
    const save = form.querySelector('button');
    const cancel = form.querySelector('[type=button]');
    const notice = form.querySelector('[role=status]');
    cancel.onclick = () => dialog.close();
    dialog.oncancel = event => { if (save.disabled) event.preventDefault(); };
    inputs[0].focus();
    form.onsubmit = async submit => {
      submit.preventDefault();
      if (save.disabled) return;
      const files = inputs.map(input => input.files[0]);
      const controls = [...inputs, save, cancel];
      controls.forEach(control => control.disabled = true);
      try {
        const selected = await Promise.all(files.map(file => file ? preparePhoto(file) : null));
        const slots = photoPageSlots(photoPages.length, count);
        selected.forEach((photo, i) => { if (photo) photos[slots[i]] = photo; });
        photoPages.push({ after: artwork, count });
        dialog.close();
        status.textContent = 'Bildesiden er lagt til · ' + money(photoPagePrices[count]) + '.';
      } catch (error) {
        notice.textContent = error.message;
        controls.forEach(control => control.disabled = false);
      }
    };
  };
  document.body.append(dialog);
  dialog.showModal();
}

function offerBirthAddon() {
  fieldIndex = lastStandardBookStep;
  projectView('birth-addon', 'Bok 0 · Fire ekstra sider', `
    <section class="conversation">
      ${assistant}
      <div class="assistant-message">
        <h2>Vil du gi foreldrene en hilsen de kan ta vare på?</h2>
        <p>På «Kjære foreldre, i dag …» kan du skrive ned det du har lyst til å si til dem akkurat nå. Kanskje hva du beundrer ved dem, eller hva du gleder deg til å se dem oppleve sammen med den lille.</p>
        <p>På «Velkommen til verden» får de en plass til å bevare fødselsdatoen, klokkeslettet og minnene fra dagen barnet kom. Fyll inn det du vet nå, eller spar siden til etter fødselen.</p>
        <p>På de to bildesidene får du plass til fire bilder som forteller litt mer om familien. Ta med et favorittbilde fra graviditeten, et gruppebilde med foreldrene eller et gammelt blinkskudd som fortsatt får dere til å le. Du kan også spare en plass til den første klemmen.</p>
      </div>
      <div class="actions">
        <button id="accept-birth-addon">${hasBirthAddon() ? 'Fortsett med de fire sidene' : 'Legg til fire sider · ' + money(birthAddon.price)}</button>
        <button id="decline-birth-addon" class="secondary">Nei takk, fortsett</button>
        <button id="back" class="secondary">Tilbake til hilsenen</button>
      </div>
    </section>`);
  panel.querySelector('#accept-birth-addon').onclick = () => {
    bookFields.birthAddon = 'yes';
    fieldIndex = birthAddonStart;
    fillBookField();
  };
  panel.querySelector('#decline-birth-addon').onclick = () => {
    bookFields.birthAddon = 'no';
    addPhotos();
  };
  panel.querySelector('#back').onclick = fillBookField;
}

async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
    throw new Error('Velg JPG, PNG eller WebP på opptil 12 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { url: canvas.toDataURL('image/jpeg', 0.9), name: file.name };
  } finally {
    bitmap.close();
  }
}

function renderPhotos(container, removable = false) {
  container.replaceChildren();
  for (const [i, photo] of photos.entries()) {
    if (!photo) continue;
    if (isPregnancy() && i >= 7 && i !== 11 && i !== 12 && i !== pregnancyMomPhotoSlot && !pregnancyGallerySlots.includes(i) && !predictionPhotoSlots.includes(i) && !lastWeeksPhotoSlots.includes(i) && !readyPhotoSlots.includes(i) &&
        !(hasBirthAddon() && birthAddon.slots.includes(i)) &&
        !photoPages.some((page, j) => photoPageSlots(j, page.count).includes(i) && activePhotoPages().includes(page)) &&
        !(hasMeetingAddon() && meetingAddon.slots.includes(i)) &&
        !(hasParentsPhotoAddon() && i === parentsPhotoAddon.slot)) continue;
    const figure = document.createElement('figure');
    const image = new Image();
    image.src = photo.url;
    image.alt = photo.name;
    figure.append(image);
    if (removable) {
      const remove = document.createElement('button');
      remove.className = 'secondary';
      remove.textContent = 'Fjern bilde';
      remove.ariaLabel = 'Fjern ' + photo.name;
      remove.onclick = () => {
        if (isPregnancy()) photos[i] = null;
        else photos.splice(i, 1);
        renderPhotos(container, true);
      };
      figure.append(remove);
    }
    container.append(figure);
  }
}

function bookInterviewMaterial() {
  if (!isPregnancy()) return answers;
  const material = originalBookFields.flatMap(field => {
    if (field.slot !== undefined || field.options || [14, 16, 20, ...birthAddon.art].includes(field.artwork) ||
        (field.artwork === meetingAddon.art[0] && !hasMeetingAddon())) return [];
    const answer = bookFields[field.key]?.trim();
    return answer ? [field.question + ': ' + answer] : [];
  });
  if (!material.length) return answers.slice(0, 5).filter(value => value?.trim());
  const batches = [];
  let batch = '';
  for (const item of material) {
    if (batch && batch.length + item.length + 1 > 1800) {
      batches.push(batch);
      batch = '';
    }
    batch += (batch ? '\n' : '') + item;
  }
  if (batch) batches.push(batch);
  return batches;
}

function addPhotos() {
  const slots = [0, 1, 2, 3];
  const limit = slots.length;
  projectView('photos', 'Bilder', `
    <div class="conversation">
      ${assistant}
      <div class="assistant-message"><h2>Har du bilder som hører til historien?</h2>
      <p>Her kan du legge til opptil ${limit} bilder. Du kan flytte dem mellom bilderammene i forhåndsvisningen.</p></div>
      <label for="photo-files">Velg bilder</label>
      <input id="photo-files" type="file" accept="image/jpeg,image/png,image/webp" multiple>
      <div class="photo-grid"></div>
      <p class="hint" id="generation-note" aria-live="polite"></p>
      <div class="actions"><button id="generate" hidden>Skriv historien med Alma</button><button id="local">Lag et lokalt utkast</button>
      ${isPregnancy() ? '<button id="skip-letter" class="secondary">Fortsett uten brev</button>' : ''}
      <button id="back" class="secondary">Tilbake</button></div>
    </div>`);
  const fileInput = panel.querySelector('#photo-files');
  const gallery = panel.querySelector('.photo-grid');
  const note = panel.querySelector('#generation-note');
  const generate = panel.querySelector('#generate');
  const local = panel.querySelector('#local');
  const skipLetter = panel.querySelector('#skip-letter');
  const back = panel.querySelector('#back');
  renderPhotos(gallery, true);
  fetch('/api/status').then(result => result.json()).then(({ ai }) => {
    generate.hidden = !ai || !bookInterviewMaterial().some(value => value?.trim());
    note.textContent = ai ? 'Hvis du velger Alma, sendes intervjusvarene til OpenAI. Bildene blir i nettleseren.' :
      'OpenAI er ikke koblet til. Du kan fortsatt se et enkelt utkast basert på svarene dine.';
  }).catch(() => {
    note.textContent = 'Kunne ikke sjekke OpenAI-tilkoblingen. Du kan lage et lokalt utkast.';
  });
  fileInput.onchange = async () => {
    const selected = [...fileInput.files];
    fileInput.value = '';
    status.textContent = '';
    const currentProject = projectId;
    fileInput.disabled = generate.disabled = local.disabled = back.disabled = true;
    try {
      for (const file of selected) {
        const slot = slots.find(i => !photos[i]);
        if (slot === undefined) {
          status.textContent = 'Her kan du legge til opptil ' + limit + ' bilder.';
          break;
        }
        try {
          const photo = await preparePhoto(file);
          if (projectId !== currentProject || !gallery.isConnected) return;
          photos[slot] = photo;
          renderPhotos(gallery, true);
        } catch (error) {
          status.textContent = error.message || 'Kunne ikke åpne bildet.';
        }
      }
    } finally {
      fileInput.disabled = generate.disabled = local.disabled = back.disabled = false;
    }
  };
  function finish(story, source) {
    draft = story;
    draftSource = source;
    edit();
  }
  generate.onclick = async () => {
    generate.disabled = local.disabled = back.disabled = fileInput.disabled = true;
    generate.textContent = 'Alma skriver …';
    status.textContent = '';
    try {
      const result = await fetch('/api/story', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: isPregnancy()
            ? pregnancyPerspective() === pregnancyGift
              ? 'Graviditet – brev til barnet fra en nær person'
              : 'Graviditet – brev fra en forelder til barnet'
            : occasion?.name ?? 'Minnebok',
          answers: bookInterviewMaterial()
        })
      });
      const data = await result.json();
      if (!generate.isConnected) return;
      if (!result.ok) throw new Error(data.error);
      finish(data.story, 'ai');
    } catch (error) {
      if (generate.isConnected) status.textContent = error.message;
    } finally {
      generate.disabled = local.disabled = back.disabled = fileInput.disabled = false;
      generate.textContent = 'Skriv historien med Alma';
    }
  };
  local.onclick = () => {
    if (!isPregnancy()) finish(createDraft(answers), 'local');
    else {
      const fragments = originalBookFields
        .filter(field => [7, 8].includes(field.artwork) && field.max && field.key !== 'first-date')
        .map(field => bookFields[field.key]?.trim()).filter(Boolean);
      finish(fragments.length ? fragments.join('\n\n') : createDraft(answers.slice(0, 5)), 'local');
    }
  };
  if (skipLetter) skipLetter.onclick = chooseFormat;
  back.onclick = () => {
    if (hasBirthAddon()) {
      fieldIndex = lastBookStep;
      fillBookField();
    } else if (isPregnancy()) offerBirthAddon();
    else {
      index = 4;
      interview();
    }
  };
}

function edit() {
  projectView('draft', 'Bokutkast', `
    <h2>Les historien din</h2>
    <p class="hint">${draftSource === 'ai' ? 'Alma har skrevet et utkast fra svarene dine. Les gjennom og juster teksten før du godkjenner.' : 'Dette lokale utkastet setter sammen svarene dine. Du kan redigere det før du godkjenner.'}</p>
    <form>
      <label for="draft">Boktekst</label>
      <textarea id="draft" ${isPregnancy() ? '' : 'required maxlength="16000"'}></textarea>
      <div class="actions"><button>${isPregnancy() ? 'Godkjenn og fortsett' : 'Godkjenn og velg format'}</button><button type="button" class="secondary" id="back">Tilbake til bilder</button></div>
    </form>`);
  const field = panel.querySelector('#draft');
  field.value = draft;
  if (isPregnancy()) attachWordLimit(field, letterWordLimit, true);
  field.oninput = () => {
    draft = field.value;
  };
  panel.querySelector('form').onsubmit = event => {
    event.preventDefault();
    if (!isPregnancy() && !field.value.trim()) {
      status.textContent = 'Boka trenger litt tekst før du går videre.';
      return;
    }
    draft = field.value.trim();
    chooseFormat();
  };
  panel.querySelector('#back').onclick = () => {
    addPhotos();
  };
}

function chooseFormat() {
  projectView('format', 'Format', `
    <h2>${isPregnancy() ? 'Oppsummering av bokvalget' : 'Hvordan vil du ha boka?'}</h2>
    <p class="hint">Prisene er eksempler. Du kan se hele prøvebestillingen her.</p>
    <form>
      ${isPregnancy() ? `<p>${products[format].label}${sizeLabel(format) ? ' · ' + sizeLabel(format) : ''}</p><button type="button" id="change-size" class="secondary">Endre format og størrelse</button>` : `<fieldset><legend>Bokformat</legend>
        ${Object.entries(products).map(([id, item]) => `<label><input type="radio" name="format" value="${id}" ${id === format ? 'checked' : ''}> ${item.label} · ${money(productPrice(id))}</label>`).join('')}
      </fieldset>`}
    <div id="offer"></div>
      <p>${includedPages() + selectedExtraPages()} sider${selectedExtraPages() ? " · inkluderer " + selectedExtraPages() + (selectedExtraPages() === 1 ? " ekstra side (+" : " ekstra sider (+") + money(pagePrice()) + ")" : ""}</p>
      <p id="total" aria-live="polite"></p>
      <div class="actions"><button>Se prøvebestilling</button><button type="button" class="secondary" id="back">Rediger bokteksten</button></div>
    </form>`);
  const form = panel.querySelector('form');
  const offer = panel.querySelector('#offer');
  const total = panel.querySelector('#total');
  const changeSize = panel.querySelector('#change-size');
  if (changeSize) {
    changeSize.onclick = () => chooseBookOptions((size, selectedFormat) => {
      bookSize = size;
      format = selectedFormat;
      chooseFormat();
    }, chooseFormat, bookSize ?? 'standard', format, 'Bruk dette bokvalget');
  }
  let addition;
  function updateTotal() {
    const extra = offer.querySelector('input')?.checked ? addition.price : 0;
    total.textContent = 'Eksempelpris totalt ' + money(productPrice(format) + pagePrice() + extra);
  }
  function showOffer() {
    addition = recommend(format, answers[4]);
    offer.innerHTML = addition ? `<div class="offer">${assistant}<p class="assistant-message">${addition.reason} Vil du legge det til?</p><label><input type="checkbox" ${bookFields.purchaseAddition === addition.label ? 'checked' : ''}> ${addition.label} · ${money(addition.price)}</label></div>` : '';
    updateTotal();
  }
  form.onchange = event => {
    if (event.target.name === 'format') {
      format = event.target.value;
      showOffer();
    } else {
      updateTotal();
    }
  };
  form.onsubmit = event => {
    event.preventDefault();
    const selectedAddition = offer.querySelector('input')?.checked ? addition : null;
    bookFields.purchaseAddition = selectedAddition?.label;
    summary(selectedAddition);
  };
  panel.querySelector('#back').onclick = edit;
  showOffer();
}

function bookViewerMarkup(shownFormat = null) {
  const formatPicker = shownFormat ? `
    <fieldset class="preview-formats print-hide">
      <legend>Vis boka som</legend>
      ${Object.entries(products).map(([id, item]) => `
        <label><input type="radio" name="preview-format" value="${id}" ${id === shownFormat ? 'checked' : ''}>
        <span>${item.label}</span></label>`).join('')}
    </fieldset>` : '';
  return `${formatPicker}<div class="book-viewer print-hide" role="region" aria-label="Bla i minneboka" tabindex="0">
    <div class="book-stage"></div>
    <button id="book-previous" class="book-arrow secondary" aria-label="Bla tilbake"><span aria-hidden="true">‹</span></button>
    <button id="book-next" class="book-arrow secondary" aria-label="Åpne boka"><span aria-hidden="true">›</span></button>
    <span id="book-position" role="status"></span>
  </div>`;
}

function positionOnPage(element, [left, top, width, height]) {
  element.style.left = left + '%';
  element.style.top = top + '%';
  if (width !== undefined) element.style.width = width + '%';
  if (height !== undefined) element.style.height = height + '%';
}

function applyPhotoCrop(image, photo) {
  const zoom = photo.zoom ?? 100;
  const vertical = photo.vertical ?? 50;
  image.style.setProperty('--photo-size', zoom + '%');
  image.style.setProperty('--photo-left', ((100 - zoom) / 2) + '%');
  image.style.setProperty('--photo-top', ((100 - zoom) * vertical / 100) + '%');
  image.style.setProperty('--photo-position', vertical + '%');
}

function showBookPreview(title, examplePages = null, root = panel) {
  const viewer = root.querySelector('.book-viewer');
  const stage = viewer.querySelector('.book-stage');
  const previous = viewer.querySelector('#book-previous');
  const next = viewer.querySelector('#book-next');
  const position = viewer.querySelector('#book-position');
  const themed = Boolean(examplePages) || isPregnancy();
  viewer.classList.toggle('pregnancy-viewer', themed);
  const formatPicker = root.querySelector('.preview-formats');
  const showFormat = () => {
    viewer.dataset.binding = formatPicker?.querySelector(':checked')?.value ?? 'hard';
  };
  if (formatPicker) formatPicker.onchange = showFormat;
  showFormat();
  if (themed && (!examplePages || location.hash === '#eksempel-elli')) work.classList.add('wide-book');
  const editor = root.querySelector('#photo-editor');
  const photoStatus = root.querySelector('#photo-edit-status');
  const textEditor = root.querySelector('#book-text-editor');
  const layout = () => {
    if (!themed) return bookPages(draft, photos);
    return originalPregnancyBook(draft, photos, answers, bookFields, textPlacement, photoPages);
  };
  let pages = examplePages ?? layout();
  const spreadCount = Math.ceil((pages.length + 1) / 2);
  const lastView = spreadCount + Number(themed);
  const remembersSpread = Boolean(examplePages) && location.hash === '#eksempel-elli';
  const savedSpread = remembersSpread ? load('elli-spread') : null;
  const initialSpread = examplePages ? (Number.isInteger(savedSpread) ? savedSpread : 1) : (previewState?.spread ?? 0);
  let spread = Math.max(0, Math.min(lastView, initialSpread));
  let activePhotoSlot;
  let activeText;
  let visiblePhotoPages = [];

  function attachMove(element, type, key, filled, select) {
    element.dataset.bookMove = type;
    element.dataset.moveKey = key;
    element.dataset.filled = String(filled);
    let start;
    let target;
    let moved = false;
    const image = type === 'photo' ? element.querySelector('img') : null;
    const cropPhoto = element.classList.contains('original-page-photo') && image ? photos[key] : null;

    function clearTarget() {
      target?.classList.remove('book-drop-target');
      target = undefined;
    }

    function updateDragCrop(event) {
      const bounds = start.bounds;
      const delta = event.clientY - start.y;
      if (Math.abs(delta) <= Math.abs(event.clientX - start.x)) return;
      const fittedHeight = image.naturalHeight * bounds.width / image.naturalWidth || bounds.height;
      const fitZoom = fittedHeight <= bounds.height * 1.02 ? 115 : 100;
      const zoom = Math.max(start.zoom ?? 100, fitZoom);
      const travel = Math.max(bounds.height * zoom / 100, fittedHeight * zoom / 100) - bounds.height;
      cropPhoto.zoom = zoom;
      cropPhoto.vertical = Math.round(Math.max(0, Math.min(100, (start.vertical ?? 50) - delta * 100 / travel)));
      start.cropped = true;
      applyPhotoCrop(image, cropPhoto);
    }

    function restoreDragCrop() {
      if (!start?.cropped) return;
      cropPhoto.zoom = start.zoom;
      cropPhoto.vertical = start.vertical;
      applyPhotoCrop(image, cropPhoto);
    }

    element.onclick = () => {
      if (!moved) select();
      moved = false;
    };
    element.onpointerdown = event => {
      moved = false;
      if (!filled || event.button !== 0 || !event.isPrimary) return;
      start = { x: event.clientX, y: event.clientY };
      if (cropPhoto) {
        start.bounds = element.getBoundingClientRect();
        start.zoom = cropPhoto.zoom;
        start.vertical = cropPhoto.vertical;
      }
      element.setPointerCapture(event.pointerId);
    };
    element.onpointermove = event => {
      if (!start || !event.isPrimary) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6 && !moved) return;
      moved = true;
      clearTarget();
      const candidate = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-book-move]');
      if (cropPhoto && candidate === element) {
        updateDragCrop(event);
        return;
      }
      if (!candidate || candidate === element || candidate.dataset.bookMove !== type || !stage.contains(candidate)) return;
      target = candidate;
      target.classList.add('book-drop-target');
    };
    element.onpointercancel = () => {
      restoreDragCrop();
      start = undefined;
      clearTarget();
    };
    element.onpointerup = event => {
      if (!start || !event.isPrimary) return;
      const destination = target?.dataset.moveKey;
      clearTarget();
      if (destination !== undefined) restoreDragCrop();
      else if (start.cropped) {
        activePhotoSlot = key;
        editPhoto(visiblePhotoPages);
        photoStatus.textContent = 'Bildeutsnittet er oppdatert.';
      }
      start = undefined;
      if (destination === undefined) return;
      if (type === 'text') moveText(key, destination);
      else movePhoto(key, Number(destination));
    };
  }

  function findText(key) {
    for (const [index, page] of pages.entries()) {
      const field = page.fields?.find(candidate => candidate.key === key);
      if (field) return { field, index };
    }
  }

  function goToPage(index) {
    spread = Math.floor((index + 1) / 2) + 1;
  }

  function refreshBook(message) {
    pages = layout();
    render();
    panel.querySelector('#book-text').textContent = draft;
    renderPhotos(panel.querySelector('.print-book .photo-grid'));
    photoStatus.textContent = message;
  }

  function moveText(origin, target) {
    const from = findText(origin);
    const to = findText(target);
    if (!from?.field.value || !to || origin === target) return;
    textPlacement[origin] = to.field.source;
    textPlacement[target] = from.field.source;
    activeText = target;
    goToPage(to.index);
    refreshBook(to.field.value ? 'Tekstfeltene byttet plass.' : 'Teksten ble flyttet til side ' + (to.index + 1) + '.');
    textEditor.querySelector('textarea')?.focus({ preventScroll: true });
  }

  function editText() {
    beforeProjectSave = undefined;
    textEditor.replaceChildren();
    const selected = activeText ? findText(activeText) : undefined;
    textEditor.hidden = !selected;
    if (!selected) return;
    const { field, index } = selected;
    const form = document.createElement('form');
    const heading = document.createElement('h3');
    heading.textContent = 'Rediger tekst på side ' + (index + 1);
    const label = document.createElement('label');
    label.htmlFor = 'book-field-edit';
    label.textContent = field.question;
    const input = document.createElement('textarea');
    input.id = label.htmlFor;
    input.value = field.value;
    const actions = document.createElement('div');
    actions.className = 'photo-move';
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Lagre tekst';
    actions.append(saveButton);
    form.append(heading, label, input, actions);
    attachWordLimit(input, limitForBookField(field), true);
    function commitText() {
      if (!input.reportValidity()) return false;
      if (input.value === field.value) return true;
      const value = input.value.trim();
      if (field.source === 'letter') {
        if (!value) {
          status.textContent = 'Skriv litt tekst før du lagrer bokteksten.';
          return false;
        }
        draft = value;
        if (bookFields.letter?.trim()) bookFields.letter = value;
      } else bookFields[field.source] = value;
      refreshBook('Teksten er oppdatert.');
      textEditor.querySelector('textarea').focus({ preventScroll: true });
      return true;
    }
    form.onsubmit = event => {
      event.preventDefault();
      commitText();
    };
    beforeProjectSave = commitText;
    textEditor.append(form);
    if (!field.value) return;
    const move = document.createElement('div');
    move.className = 'photo-move';
    const targetLabel = document.createElement('label');
    targetLabel.htmlFor = 'text-destination';
    targetLabel.textContent = 'Flytt tekst til';
    const destination = document.createElement('select');
    destination.id = targetLabel.htmlFor;
    for (const [i, page] of pages.entries()) {
      for (const target of page.fields ?? []) {
        if (target.key === field.key) continue;
        destination.add(new Option('Side ' + (i + 1) + ' · ' + target.question +
          (target.value ? ' (bytt plass)' : ''), target.key));
      }
    }
    const moveButton = document.createElement('button');
    moveButton.className = 'secondary';
    moveButton.textContent = 'Flytt tekst';
    moveButton.onclick = () => moveText(field.key, destination.value);
    move.append(targetLabel, destination, moveButton);
    textEditor.append(move);
  }

  function photoTargets(index) {
    const page = pages[index];
    if (!page) return [];
    if (page.photoFrames) return page.photoFrames.map((frame, i) => ({
      ...frame, index, label: 'Side ' + (index + 1) + ' · Bilde ' + (i + 1)
    }));
    return page.photoSlot === undefined ? [] : [{
      slot: page.photoSlot, photo: page.photo, box: page.photoBox, index, label: 'Side ' + (index + 1)
    }];
  }

  function movePhoto(origin, target) {
    const destination = pages.flatMap((_, index) => photoTargets(index)).find(frame => frame.slot === target);
    if (!photos[origin] || !destination || origin === target) return;
    const replaced = photos[target];
    [photos[target], photos[origin]] = [photos[origin], replaced ?? null];
    activePhotoSlot = target;
    activeText = undefined;
    goToPage(destination.index);
    updatePhoto(replaced ? 'Bildene byttet plass.' : 'Bildet ble flyttet. ' + destination.label + '.');
  }

  function selectPhoto(slot) {
    activePhotoSlot = slot;
    activeText = undefined;
    if (textEditor) editText();
    editPhoto(visiblePhotoPages);
    editor.querySelector('input')?.focus();
  }

  function pageAt(index, side) {
    const page = document.createElement('div');
    page.className = 'book-page book-page-' + side;
    const content = pages[index];
    if (!content) {
      page.classList.add('book-endpaper');
      page.setAttribute('aria-hidden', 'true');
      return page;
    }
    if (content.artwork) {
      page.classList.add('original-book-page');
      const artwork = document.createElement('div');
      artwork.className = 'original-page-art';
      artwork.dataset.artPage = content.artwork;
      artwork.setAttribute('role', 'img');
      artwork.setAttribute('aria-label', 'Originaldesignet på side ' + (index + 1));
      page.append(artwork);
      for (const label of content.labels ?? []) {
        const caption = document.createElement('span');
        caption.className = 'original-page-label';
        if (label.style) caption.dataset.style = label.style;
        caption.textContent = label.text;
        positionOnPage(caption, label.box);
        page.append(caption);
      }
      for (const field of content.fields ?? []) {
        if (!textEditor && !field.value) continue;
        const fill = document.createElement(textEditor ? 'button' : 'div');
        if (textEditor) fill.type = 'button';
        fill.className = 'original-page-field editable-book-field';
        fill.dataset.bookField = field.key;
        const content = document.createElement('span');
        content.textContent = field.value;
        fill.append(content);
        fill.classList.toggle('empty-book-field', !field.value);
        if (field.pitch) {
          fill.classList.add('lined-book-field');
          fill.style.setProperty('--book-line-height', (field.pitch * 100 / 888) + 'cqw');
        }
        if (textEditor) fill.setAttribute('aria-label', 'Rediger tekst: ' + field.question);
        positionOnPage(fill, field.box);
        if (textEditor) attachMove(fill, 'text', field.key, Boolean(field.value), () => {
          activeText = field.key;
          editText();
          textEditor.querySelector('textarea').focus();
        });
        page.append(fill);
      }
      for (const mark of content.marks ?? []) {
        const graphic = document.createElement('span');
        graphic.className = 'original-page-mark';
        graphic.textContent = mark.symbol;
        graphic.setAttribute('role', 'img');
        graphic.setAttribute('aria-label', mark.label);
        positionOnPage(graphic, mark.point);
        page.append(graphic);
      }
      for (const frame of photoTargets(index)) {
        if (!editor && !frame.photo) continue;
        const photoBox = document.createElement(editor ? 'button' : 'div');
        if (editor) photoBox.type = 'button';
        photoBox.className = 'original-page-photo editable-book-field';
        photoBox.classList.toggle('empty-book-field', !frame.photo);
        const simpleLabel = (frame.photo ? 'Rediger bilde' : 'Legg til bilde') + ' på side ' + (index + 1);
        if (editor) photoBox.setAttribute('aria-label', content.photoFrames ? (frame.photo ? 'Rediger · ' : 'Legg til · ') + frame.label : simpleLabel);
        photoBox.dataset.photoSlot = frame.slot;
        if (frame.box) positionOnPage(photoBox, frame.box);
        if (frame.photo) {
          const image = new Image();
          image.src = frame.photo.url;
          image.alt = frame.photo.name;
          image.draggable = false;
          applyPhotoCrop(image, frame.photo);
          photoBox.append(image);
        }
        if (content.artwork === 34 && !frame.photo) {
          photoBox.classList.add('extra-photo-frame');
          photoBox.textContent = 'Legg til bilde';
        }
        if (editor) attachMove(photoBox, 'photo', frame.slot, Boolean(frame.photo), () => selectPhoto(frame.slot));
        page.append(photoBox);
      }
      return page;
    }
    if (content.kind) page.classList.add('book-' + content.kind);
    if (content.section) {
      const section = document.createElement('p');
      section.className = 'book-section-label';
      section.textContent = content.section;
      page.append(section);
    }
    if (content.heading && !content.photo) {
      const heading = document.createElement('h3');
      heading.textContent = content.heading;
      page.append(heading);
    }
    if (content.question) {
      const question = document.createElement('p');
      question.className = 'book-interview-question';
      question.textContent = content.question;
      page.append(question);
    }
    if (content.photo) {
      page.classList.add('book-image-page');
      const img = new Image();
      img.src = content.photo.url;
      img.alt = content.photo.name;
      if (editor && content.photoSlot !== undefined) {
        const photoButton = document.createElement('button');
        photoButton.className = 'book-photo-button';
        photoButton.ariaLabel = 'Rediger bilde på side ' + (index + 1);
        img.draggable = false;
        photoButton.append(img);
        attachMove(photoButton, 'photo', content.photoSlot, true, () => selectPhoto(content.photoSlot));
        page.append(photoButton);
      } else page.append(img);
    } else {
      page.classList.add('book-text-page');
      for (const paragraph of content.paragraphs ?? []) {
        const line = document.createElement('p');
        line.textContent = paragraph;
        page.append(line);
      }
      if (content.kind === 'photo') {
        const placeholder = document.createElement(editor ? 'button' : 'p');
        if (editor) attachMove(placeholder, 'photo', content.photoSlot, false, () => selectPhoto(content.photoSlot));
        placeholder.className = 'book-photo-placeholder';
        placeholder.textContent = 'Plass til et bilde';
        page.append(placeholder);
      } else if (content.kind === 'note' || (content.kind === 'interview' && !content.paragraphs.length)) {
        const lines = document.createElement('div');
        lines.className = 'book-writing-lines';
        lines.setAttribute('aria-hidden', 'true');
        page.append(lines);
      }
    }
    const number = document.createElement('span');
    number.className = 'book-page-number';
    number.textContent = index + 1;
    number.setAttribute('aria-hidden', 'true');
    page.append(number);
    return page;
  }

  function updatePhoto(message) {
    refreshBook(message);
    editor.querySelector('input')?.focus();
  }

  function editPhoto(pageIndices) {
    editor.replaceChildren();
    const frames = pageIndices.flatMap(photoTargets);
    editor.hidden = !frames.length;
    if (editor.hidden) return;
    const frame = frames.find(item => item.slot === activePhotoSlot) ?? frames[0];
    const { slot, index: pageIndex } = frame;
    activePhotoSlot = slot;
    const toolbar = document.createElement('div');
    toolbar.className = 'photo-editor-toolbar';
    const heading = document.createElement('h3');
    heading.textContent = 'Rediger bilde';
    const controls = document.createElement('div');
    controls.className = 'photo-editor-controls';
    toolbar.append(heading, controls);
    editor.append(toolbar);
    if (frames.length > 1) {
      const label = document.createElement('label');
      label.htmlFor = 'book-active-photo';
      label.textContent = 'Velg bilderamme';
      const select = document.createElement('select');
      select.id = label.htmlFor;
      for (const item of frames) {
        const option = new Option(item.label, item.slot);
        option.selected = item.slot === slot;
        select.add(option);
      }
      select.onchange = () => {
        activePhotoSlot = Number(select.value);
        editPhoto(pageIndices);
        editor.querySelector('#book-active-photo').focus();
      };
      label.append(select);
      controls.append(label);
    }
    const pageNumber = pageIndex + 1;
    const photo = photos[slot];
    if (frames.length === 1) heading.textContent = 'Rediger bilde · side ' + pageNumber;

    const label = document.createElement('label');
    label.htmlFor = 'book-photo-file';
    label.className = 'photo-upload';
    label.textContent = photo ? 'Bytt bilde' : 'Legg til bilde';
    const file = document.createElement('input');
    file.id = label.htmlFor;
    file.type = 'file';
    file.accept = 'image/jpeg,image/png,image/webp';
    file.onchange = async () => {
      if (!file.files.length) return;
      file.disabled = true;
      try {
        const replacement = await preparePhoto(file.files[0]);
        if (!file.isConnected) return;
        photos[slot] = replacement;
        updatePhoto('Bildet på side ' + pageNumber + ' er oppdatert.');
      } catch (error) {
        if (file.isConnected) status.textContent = error.message || 'Kunne ikke åpne bildet.';
      } finally {
        file.disabled = false;
        file.value = '';
      }
    };
    label.append(file);
    controls.append(label);
    if (!photo) return;

    if (pages[pageIndex].artwork) {
      const frame = stage.querySelector('[data-photo-slot="' + slot + '"] img');
      const crop = document.createElement('fieldset');
      crop.className = 'photo-crop';
      const legend = document.createElement('legend');
      legend.textContent = 'Bildeutsnitt';
      const cropControls = document.createElement('div');
      cropControls.className = 'photo-crop-controls';
      crop.append(legend, cropControls);
      const sliders = [
        { key: 'vertical', label: 'Høydeplassering', min: 0, max: 100, defaultValue: 50 },
        { key: 'zoom', label: 'Zoom', min: 100, max: 180, defaultValue: 100 }
      ].map(({ key, label, min, max, defaultValue }) => {
        const element = document.createElement('input');
        element.id = 'crop-' + key;
        element.type = 'range';
        element.min = min;
        element.max = max;
        element.value = photo[key] ?? defaultValue;

        const rangeLabel = document.createElement('label');
        rangeLabel.htmlFor = element.id;
        rangeLabel.textContent = label;
        element.oninput = () => {
          photo[key] = Number(element.value);
          if (frame) applyPhotoCrop(frame, photo);
        };
        rangeLabel.append(element);
        cropControls.append(rangeLabel);
        return { element, defaultValue };
      });
      const reset = document.createElement('button');
      reset.className = 'secondary';
      reset.textContent = 'Tilbakestill utsnitt';
      reset.onclick = () => {
        for (const { element, defaultValue } of sliders) {
          element.value = defaultValue;
          element.oninput();
        }
      };
      crop.append(reset);
      editor.append(crop);
    }

    const moveWrap = document.createElement('div');
    moveWrap.className = 'photo-move';
    const moveLabel = document.createElement('label');
    moveLabel.htmlFor = 'book-photo-destination';
    moveLabel.textContent = 'Flytt bilde til';
    const destination = document.createElement('select');
    destination.id = moveLabel.htmlFor;
    for (const target of pages.flatMap((_, index) => photoTargets(index))) {
      if (target.slot === slot) continue;
      destination.add(new Option(target.label + (target.photo ? ' · bytt plass' : ' · ledig'), target.slot));
    }
    const moveButton = document.createElement('button');
    moveButton.className = 'secondary';
    moveButton.textContent = 'Flytt bilde';
    moveButton.onclick = () => movePhoto(slot, Number(destination.value));
    const remove = document.createElement('button');
    remove.className = 'secondary';
    remove.textContent = 'Fjern bilde';
    remove.onclick = () => {
      photos[slot] = null;
      updatePhoto('Bildet på side ' + pageNumber + ' er fjernet.');
    };
    moveWrap.append(moveLabel, destination, moveButton, remove);
    const more = document.createElement('details');
    more.className = 'photo-editor-more';
    const moreLabel = document.createElement('summary');
    moreLabel.textContent = 'Flytt eller fjern bildet';
    more.append(moreLabel, moveWrap);
    editor.append(more);
  }

  function render() {
    if (!examplePages && previewState) previewState.spread = spread;
    if (remembersSpread) save('elli-spread', spread);
    const backCover = themed && spread === lastView;
    const coverView = spread === 0 || backCover;
    stage.classList.toggle('is-cover', coverView);
    stage.replaceChildren();
    let photoPages = [];
    if (coverView) {
      const cover = document.createElement('div');
      cover.className = 'preview-cover';
      if (themed) {
        cover.classList.add('pregnancy-art');
        cover.setAttribute('role', 'img');
        cover.dataset.artPage = backCover ? originalBookPageCount + 2 : 1;
        cover.setAttribute('aria-label', backCover ? 'Baksiden av Bok 0, Før vi møtte deg.' :
          'Omslaget til Deg, gjennom våre øyne. Bok 0, før vi møtte deg.');
      } else {
        const brand = document.createElement('span');
        brand.textContent = 'Respons';
        const heading = document.createElement('strong');
        heading.textContent = title;
        const ornament = document.createElement('span');
        ornament.className = 'cover-ornament';
        ornament.setAttribute('aria-hidden', 'true');
        ornament.textContent = '✦';
        cover.append(brand, heading, ornament);
      }
      stage.append(cover);
      position.textContent = backCover ? 'Bakside' : 'Omslag';
    } else {
      // The first numbered page is a recto, so the facing endpaper is unnumbered.
      const left = (spread - 1) * 2 - 1;
      const right = left + 1;
      stage.append(pageAt(left, 'left'), pageAt(right, 'right'));
      photoPages = [left, right].filter(i => photoTargets(i).length);
      const first = Math.max(1, left + 1);
      const last = Math.min(pages.length, right + 1);
      position.textContent = 'Side ' + (first === last ? first : first + '–' + last) + ' av ' + pages.length;
    }
    // Leave controls focusable when reaching either end of the book.
    previous.setAttribute('aria-disabled', String(spread === 0));
    next.setAttribute('aria-disabled', String(spread === lastView));
    next.ariaLabel = spread === 0 ? 'Åpne boka' : themed && spread === spreadCount ? 'Se baksiden' : 'Bla videre';
    visiblePhotoPages = photoPages;
    if (textEditor) {
      let overflow = false;
      for (const entry of stage.querySelectorAll('.original-page-field')) {
        const exceedsFrame = entry.scrollHeight > entry.clientHeight + 1;
        entry.classList.toggle('book-field-overflow', exceedsFrame);
        overflow ||= exceedsFrame;
      }
      const notice = panel.querySelector('#book-fit-note');
      notice.hidden = !overflow;
    }
    if (editor) editPhoto(photoPages);
    if (textEditor) editText();
  }

  function move(delta) {
    const target = spread + delta;
    if (target < 0 || target > lastView) return;
    spread = target;
    activeText = undefined;
    if (photoStatus) photoStatus.textContent = '';
    render();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const forward = delta > 0;
      const turnedPage = stage.querySelector(forward ? '.book-page-left' : '.book-page-right');
      if (!turnedPage || turnedPage.classList.contains('book-endpaper')) return;
      const hinge = forward ? 'right center' : 'left center';
      turnedPage.animate([
        { transformOrigin: hinge, transform: 'perspective(850px) rotateY(' + (forward ? 76 : -76) + 'deg)', opacity: 0.65 },
        { transformOrigin: hinge, transform: 'perspective(850px) rotateY(0deg)', opacity: 1 }
      ], { duration: 260, easing: 'ease-out' });
    }
  }
  if (!previous) {
    stage.append(pageAt(1, 'left'), pageAt(2, 'right'));
    return;
  }
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  viewer.onkeydown = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  };
  render();
}

function summary(addition, spread = 0) {
  previewState = { addition, spread };
  const product = products[format];
  const pdf = format === 'pdf' || addition?.label === 'Digital PDF-kopi';
  const basePrice = productPrice(format);
  const total = basePrice + pagePrice() + (addition?.price ?? 0);
  const imagePages = activePhotoPages();
  const prices = [[product.label + (sizeLabel(format) ? ' · ' + sizeLabel(format) : ''), basePrice]];
  if (isPregnancy()) {
    if (hasMeetingAddon()) prices.push(['Oppslag om foreldrene', meetingAddon.price]);
    if (hasParentsPhotoAddon()) prices.push(['Bilde av foreldrene', parentsPhotoAddon.price]);
    if (hasBirthAddon()) prices.push(['Velkommen til verden · 4 sider', birthAddon.price]);
    if (imagePages.length) prices.push(['Ekstra bildesider · ' + imagePages.length, imagePages.reduce((sum, page) => sum + photoPagePrices[page.count], 0)]);
  } else if (pagePrice()) prices.push(['Ekstra sider · ' + selectedExtraPages(), pagePrice()]);
  if (addition) prices.push([addition.label, addition.price]);
  projectView('preview', 'Forhåndsvisning', `
    <h2>Din minnebok</h2>
    ${bookViewerMarkup(isPregnancy() ? format : null)}
    <p id="book-fit-note" class="book-fit-note print-hide" role="status" hidden>Ikke all teksten får plass i feltene som er markert på dette oppslaget. Hele svaret er beholdt. Trykk på feltet for å redigere eller flytte teksten.</p>
    <p class="book-edit-tip print-hide">${isPregnancy() ? 'Trykk for å redigere. Dra bildet opp eller ned i rammen for å endre utsnitt, eller dra det til en annen ramme for å flytte det.' : 'Trykk på bildet i boka for å bytte eller flytte det.'}</p>
    <section id="book-text-editor" class="print-hide" aria-label="Rediger tekst på oppslaget" hidden></section>
    <section id="photo-editor" class="print-hide" aria-label="Rediger bilde på oppslaget" hidden></section>
    <p id="photo-edit-status" class="print-hide" role="status"></p>
    <section class="book-order-summary print-hide" aria-labelledby="book-order-title">
      <header><div><h3 id="book-order-title">Prisoversikt</h3><p>${includedPages() + selectedExtraPages()} sider</p></div>
        <div class="book-order-total"><span>Total prøvepris</span><strong>${money(total)}</strong></div></header>
      <dl>${prices.map(([label, price]) => `<div><dt>${label}</dt><dd>${money(price)}</dd></div>`).join('')}</dl>
      <div class="actions">
        <button id="add-to-cart">Legg i handlevogn</button>
        <button id="back" class="secondary">Endre format</button>
        ${pdf ? '<button id="print" class="secondary">Skriv ut / lagre som PDF</button>' : ''}
      </div>
      <p class="hint">Prøvebestilling uten betaling og trykk.</p>
    </section>
    <div class="print-book" aria-hidden="true">
      <div class="receipt" id="book-text"></div>
      <div class="photo-grid"></div>
    </div>
    `);
  const title = isPregnancy() ? pregnancy.bookTitle : exampleMode ? 'Vår lille historie' : occasion ? 'Minnebok · ' + occasion.name : 'Din minnebok';
  showBookPreview(title);
  panel.querySelector('#book-text').textContent = draft;
  renderPhotos(panel.querySelector('.photo-grid'));
  panel.querySelector('#back').onclick = chooseFormat;
  if (pdf) panel.querySelector('#print').onclick = () => window.print();
  panel.querySelector('#add-to-cart').onclick = () => {
    const title = occasion?.name ?? 'Minnebok';
    const label = product.label + (sizeLabel(format) ? ' · ' + sizeLabel(format) : '') + ' · ' + (includedPages() + selectedExtraPages()) + ' sider' + (addition ? ' · ' + addition.label : '');
    projectId ??= crypto.randomUUID();
    cart = [{ id: projectId, title, label, price: total },
      ...cart.filter(item => item.id !== projectId)];
    updateCart();
    showCart();
    save('cart', cart);
  };
}

document.querySelector('#start').onclick = showBok0;


function openSiteMenu() {
  if (siteMenu.open) return;
  siteMenu.showModal();
  menuToggle.setAttribute('aria-expanded', 'true');
}

menuToggle.onclick = openSiteMenu;
document.querySelector('#menu-close').onclick = () => siteMenu.close();
siteMenu.addEventListener('close', () => menuToggle.setAttribute('aria-expanded', 'false'));
siteMenu.addEventListener('click', event => {
  if (event.target !== siteMenu) return;
  const bounds = siteMenu.getBoundingClientRect();
  if (event.clientX > bounds.right || event.clientX < bounds.left ||
      event.clientY > bounds.bottom || event.clientY < bounds.top) siteMenu.close();
});

const occasionList = document.querySelector('#occasion-list');
for (const category of [pregnancy, ...occasions]) {
  const button = document.createElement('button');
  button.className = 'occasion-button';
  button.textContent = category.name;
  button.onclick = () => {
    siteMenu.close();
    if (category === pregnancy) {
      showBok0();
    } else {
      if (location.hash) history.pushState(null, '', location.pathname + location.search);
      begin(false, category);
    }
  };
  occasionList.append(button);
}

function showBok0() {
  if (location.hash !== '#bok0') history.pushState(null, '', '#bok0');
  choosePregnancy();
}

function showAbout() {
  showWork();
  view('', `
    <h2>Om Respons</h2>
    <p class="intro">Respons lager personlige minnebøker av historiene du vil ta vare på.</p>
    <p>Vår første bok, <em>Før vi møtte deg</em>, samler minner fra ventetiden. Foreldre og andre som står familien nær kan fortelle barnet hvordan de opplevde denne tiden, med egne ord og bilder.</p>
    <button id="about-bok0">Se Bok 0</button>`);
  panel.querySelector('#about-bok0').onclick = showBok0;
}

const drawerActions = {
  guide() {
    openMenuSection('#bok0-process');
    document.querySelector('#bok0-process').focus({ preventScroll: true });
  },
  examples() {
    showBok0();
    panel.querySelector('#see-bok0').click();
  },
  projects: showProjects,
  about: showAbout,
  profile: () => document.querySelector('#profile').click()
};

for (const button of siteMenu.querySelectorAll('[data-menu-action]')) {
  button.onclick = () => {
    siteMenu.close();
    drawerActions[button.dataset.menuAction]();
  };
}

function openMenuSection(hash) {
  if (hash === '#eksempel-elli') {
    const exampleSetup = elliExampleProject();
    const pages = elliExample();
    const size = bookSizes[exampleSetup.bookSize];
    const extraImages = exampleSetup.photoPages.map(({ count }) => count).sort((a, b) => a - b);
    const extras = [
      ['Oppslag om foreldrene · 2 sider', meetingAddon.price],
      ['Velkommen til verden · 4 sider', birthAddon.price],
      ...extraImages.map(count => ['Bildeside med ' + count + (count === 1 ? ' bilde' : ' bilder'), photoPagePrices[count]]),
      [exampleSetup.preview.addition.label, exampleSetup.preview.addition.price]
    ];
    const basePrice = pregnancyPrice(exampleSetup.format, size);
    showWork();
    view('', `
      <h2>Elli sin minnebok</h2>
      <p class="hint">Utfylt prøvebok med ${pages.length} sider.</p>
      ${bookViewerMarkup('hard')}
      <section class="book-order-summary" aria-labelledby="elli-setup-title">
        <header><div><h3 id="elli-setup-title">Slik er Elli-boka satt sammen</h3>
          <p>${pages.length} sider · Fra en som står familien nær</p></div>
          <div class="book-order-total"><span>Total prøvepris</span><strong>${money(basePrice + extras.reduce((total, [, price]) => total + price, 0))}</strong></div>
        </header>
        <dl>${[[products[exampleSetup.format].label + ' · ' + size.label + ' · ' + size.dimensions, basePrice], ...extras].map(([label, price]) =>
          `<div><dt>${label}</dt><dd>${money(price)}</dd></div>`).join('')}</dl>
        <div class="actions"><a href="#lag-som-elli" class="example-create-link">Lag en bok som denne</a></div>
        <p class="hint">Samme oppsett, med dine egne ord og bilder.</p>
      </section>
      <div class="actions">
        <button id="save-elli-example">Åpne som redigerbart prosjekt</button>
        <a href="#bok0">Tilbake til graviditetsboka</a>
      </div>`);
    showBookPreview('Elli sin minnebok', pages);
    const button = panel.querySelector('#save-elli-example');
    button.onclick = async () => {
      button.disabled = true;
      try {
        const example = elliExampleProject();
        let project = await localProjects('readonly', store => store.get(example.projectId));
        if (!project) {
          await localProjects('readwrite', store => store.put(example));
          project = example;
        }
        if (!button.isConnected) return;
        openProject(project);
        saveConfirmation.textContent = 'Lagret i nettleseren. Fortsett under Mine prosjekter.';
      } catch {
        status.textContent = 'Kunne ikke åpne prøveprosjektet. Prøv igjen.';
      } finally {
        button.disabled = false;
      }
    };
  } else if (hash === '#lag-som-elli') {
    const setup = elliExampleProject();
    begin(false, setup.occasion, setup.bookSize, setup.format, setup);
  } else if (hash === '#bok0-avsender') {
    chooseBookSender();
  } else if (hash === '#occasions') {
    openSiteMenu();
  } else if (hash === '#bok0' || hash === '#bok0-process') {
    if (!panel.querySelector('#bok0') || work.hidden) choosePregnancy();
    document.getElementById(hash.slice(1)).scrollIntoView({ block: 'start' });
  }
}

window.addEventListener('hashchange', () => {
  if (location.hash) openMenuSection(location.hash);
  else showHome();
});
if (location.hash) openMenuSection(location.hash);
else showHome();

async function showProjects() {
  showWork();
  view('', '<h2>Mine prosjekter</h2><p class="hint">Her finner du bokprosjektene du har lagret i denne nettleseren.</p><div id="items" class="saved-items"></div>');
  const items = panel.querySelector('#items');
  items.textContent = 'Henter prosjektene dine …';
  let projects;
  try {
    projects = await localProjects('readonly', store => store.getAll());
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    if (!items.isConnected) return;
    items.textContent = 'Kunne ikke hente prosjektene dine.';
    return;
  }
  if (!items.isConnected) return;
  items.replaceChildren();
  if (!projects.length) items.textContent = 'Bruk «Lagre prosjekt» mens du lager boka, så finner du den her.';
  for (const project of projects) {
    const button = document.createElement('button');
    button.className = 'secondary';
    const title = project.exampleMode ? 'Eksempelhistorie' : project.occasion?.name ?? 'Minnebok';
    const perspective = project.occasion?.perspective === 'gift' ? ' · Fra meg som står familien nær' : '';
    const excerpt = project.bookFields?.til?.trim() || project.answers.find(answer => answer?.trim())?.trim();
    button.textContent = title + perspective + (excerpt ? ' · ' + excerpt.slice(0, 64) : '');
    if (project.updatedAt) {
      const time = document.createElement('small');
      time.textContent = 'Sist lagret ' + new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short' }).format(project.updatedAt);
      button.append(time);
    }
    button.onclick = () => openProject(project);
    items.append(button);
  }
}

function showCart() {
  showWork();
  view('', '<h2>Handlevogn</h2><p class="hint">Prøvebestilling uten betaling og trykk.</p><div id="items" class="saved-items"></div>');
  const items = panel.querySelector('#items');
  if (!cart.length) items.textContent = 'Handlevogna er tom.';
  for (const item of cart) {
    const row = document.createElement('div');
    row.className = 'cart-row';
    const details = document.createElement('p');
    details.textContent = item.title + ' · ' + item.label + ' · ' + money(item.price);
    const remove = document.createElement('button');
    remove.className = 'secondary';
    remove.textContent = 'Fjern';
    remove.ariaLabel = 'Fjern ' + item.title;
    remove.onclick = () => {
      cart = cart.filter(entry => entry.id !== item.id);
      updateCart();
      showCart();
      save('cart', cart);
    };
    row.append(details, remove);
    items.append(row);
  }
  if (cart.length) {
    const total = document.createElement('p');
    total.textContent = 'Eksempelpris totalt ' + money(cart.reduce((sum, item) => sum + item.price, 0));
    items.append(total);
  }
}

document.querySelector('#cart').onclick = showCart;
document.querySelector('#profile').onclick = () => showAccount();
updateCart();

const accountDialog = document.querySelector('#account-dialog');
const accountContent = document.querySelector('#account-content');
const accountHeading = document.querySelector('#account-heading');
const accountStatus = document.querySelector('#account-status');
document.querySelector('#account-close').onclick = () => accountDialog.close();
let accountSession = null;
try {
  accountSession = JSON.parse(sessionStorage.getItem('respons-account'));
} catch {
  // A new sign-in is available even when browser storage is unavailable.
}
let accountConfigPromise;
let refreshAccount;

function setAccountSession(session) {
  accountSession = session;
  try {
    if (session) sessionStorage.setItem('respons-account', JSON.stringify(session));
    else sessionStorage.removeItem('respons-account');
  } catch {
    // The account remains signed in for this page.
  }
}

function accountConfiguration() {
  if (!accountConfigPromise) accountConfigPromise = fetch('/api/status')
    .then(response => response.ok ? response.json() : {})
    .then(({ account }) => {
      if (!account?.key || !account.url?.startsWith('https://')) return null;
      return { ...account, url: account.url.replace(/\/+$/, '') };
    }).catch(() => null);
  return accountConfigPromise;
}

async function accountRequest(path, { method = 'GET', token, body, prefer } = {}) {
  const config = await accountConfiguration();
  if (!config) throw new Error('Innlogging er ikke koblet til i denne prøveversjonen ennå.');
  const headers = { apikey: config.key };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(config.url + path, { method, headers, body: body && JSON.stringify(body) });
  if (!response.ok) {
    const error = new Error('Forespørselen kunne ikke fullføres.');
    error.status = response.status;
    throw error;
  }
  const result = await response.text();
  return result ? JSON.parse(result) : null;
}

function getAccountSession() {
  if (!accountSession?.access_token) return Promise.reject(Object.assign(new Error('Logg inn først.'), { status: 401 }));
  if (accountSession.expiresAt > Date.now() + 30000) return Promise.resolve(accountSession);
  if (!refreshAccount) {
    const refreshToken = accountSession.refresh_token;
    refreshAccount = accountRequest('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: { refresh_token: refreshToken }
    }).then(data => {
      if (accountSession?.refresh_token !== refreshToken) throw Object.assign(new Error('Økten er avsluttet.'), { status: 401 });
      return acceptSession(data);
    }).catch(error => {
      if ([400, 401, 403].includes(error.status)) {
        if (accountSession?.refresh_token === refreshToken) setAccountSession(null);
        error.status = 401;
      }
      throw error;
    }).finally(() => { refreshAccount = undefined; });
  }
  return refreshAccount;
}

function acceptSession(data) {
  if (!data?.access_token || !data.refresh_token || !data.user?.id) throw new Error('Ingen kontoøkt.');
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user,
    expiresAt: Date.now() + data.expires_in * 1000 };
  setAccountSession(session);
  return session;
}

function showAccount(onLogin, mode = "sign-in") {
  accountStatus.textContent = '';
  if (!accountDialog.open) accountDialog.showModal();
  if (accountSession && !onLogin) {
    accountHeading.textContent = 'Profil';
    accountContent.innerHTML = '<p id="signed-in-email"></p><div class="actions"><button id="account-projects">Mine prosjekter</button><button id="account-signout" class="secondary">Logg ut</button></div>';
    accountContent.querySelector('#signed-in-email').textContent = 'Innlogget som ' + accountSession.user.email;
    accountContent.querySelector('#account-projects').onclick = () => {
      accountDialog.close();
      showProjects();
    };
    accountContent.querySelector('#account-signout').onclick = () => {
      const token = accountSession.access_token;
      setAccountSession(null);
      accountRequest('/auth/v1/logout?scope=local', { method: 'POST', token }).catch(() => {});
      answers = [];
      photos = [];
      draft = '';
      bookFields = {};
      textPlacement = {};
      projectId = null;
      panel.replaceChildren();
      showHome();
      accountDialog.close();
    };
    return;
  }
  const registering = mode === 'register';
  accountHeading.textContent = registering ? 'Opprett konto' : 'Logg inn';
  accountContent.innerHTML = `
    <p>${registering ? 'Opprett en konto med e-postadressen din, så kan du lagre og fortsette på boka.' :
      'Logg inn med en engangskode for å lagre eller åpne boka di.'}</p>
    <form>
      <label for="account-email">E-postadresse</label>
      <input id="account-email" name="email" type="email" autocomplete="email" required>
      <button type="submit" disabled>${registering ? 'Send registreringskode' : 'Send engangskode'}</button>
    </form>
    <div class="account-mode">
      <p>${registering ? 'Har du allerede en konto?' : 'Ny hos Respons?'}</p>
      <button id="account-switch" type="button" class="secondary">${registering ? 'Til innlogging' : 'Opprett konto'}</button>
    </div>`;
  const form = accountContent.querySelector('form');
  const submit = form.querySelector('button');
  accountContent.querySelector('#account-switch').onclick = () => showAccount(onLogin, registering ? 'sign-in' : 'register');
  accountContent.querySelector('#account-email').focus();
  accountConfiguration().then(config => {
    if (!accountDialog.open || !form.isConnected) return;
    submit.disabled = !config;
    if (!config) {
      accountStatus.textContent = 'Innlogging og registrering er ikke koblet til ennå. Du kan fortsette å redigere boka mens siden er åpen.';
    }
  });
  form.onsubmit = async event => {
    event.preventDefault();
    const email = new FormData(form).get('email').trim();
    submit.disabled = true;
    accountStatus.textContent = 'Sender kode …';
    try {
      await accountRequest('/auth/v1/otp', { method: 'POST', body: { email, create_user: registering } });
      if (accountDialog.open && form.isConnected) showAccountCode(email, onLogin, mode);
    } catch (error) {
      if (accountDialog.open && form.isConnected) accountStatus.textContent = error.status === 429
        ? 'Du har bedt om en kode nylig. Vent litt før du prøver igjen.'
        : 'Kunne ikke sende kode. Sjekk e-postadressen eller prøv igjen.';
    } finally {
      submit.disabled = false;
    }
  };
}

function showAccountCode(email, onLogin, mode) {
  accountHeading.textContent = 'Bekreft e-post';
  accountContent.innerHTML = `<p id="code-destination"></p><form>
    <label for="account-code">Engangskode</label>
    <input id="account-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>
    <button>${mode === 'register' ? 'Bekreft og opprett konto' : 'Bekreft og logg inn'}</button>
    <button id="change-email" class="secondary" type="button">Bruk en annen e-postadresse</button>
  </form>`;
  accountContent.querySelector('#code-destination').textContent = 'Skriv inn koden sendt til ' + email + '.';
  accountStatus.textContent = '';
  const form = accountContent.querySelector('form');
  form.querySelector('input').focus();
  form.querySelector('#change-email').onclick = () => showAccount(onLogin, mode);
  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector('button');
    submit.disabled = true;
    try {
      const token = new FormData(form).get('code');
      const data = await accountRequest('/auth/v1/verify', { method: 'POST', body: { email, token, type: 'email' } });
      if (!accountDialog.open || !form.isConnected) return;
      acceptSession(data);
      accountDialog.close();
      onLogin?.();
    } catch {
      if (accountDialog.open && form.isConnected) accountStatus.textContent = 'Koden kunne ikke bekreftes. Sjekk koden eller be om en ny.';
    } finally {
      submit.disabled = false;
    }
  };
}
