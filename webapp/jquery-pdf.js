/*
 * TODO
 * Texte (sélection + recherche) en utilisant page.getTextContent.
 * Exemple ici : https://github.com/vivin/pdfjs-text-selection-demo/blob/master/js/minimal.js
 */

var PDFLang = {};

PDFLang['fr'] = {
	'pdf-action-text-format': '%T% (touche "%K%")',
	'pdf-open-file': 'Ouvrir un fichier ...',
	'pdf-open-url': 'Ouvrir une URL ...',
	'pdf-page-first': 'Première page',
	'pdf-page-first-key': 'Début',
	'pdf-page-previous': 'Page précédente',
	'pdf-page-previous-key': 'Page préc.',
	'pdf-page-next': 'Page suivante',
	'pdf-page-next-key': 'Page suiv.',
	'pdf-page-last': 'Dernière page',
	'pdf-page-last-key': 'Fin',
	'pdf-page-numbering': 'Page %PN% sur %PC%',
	'pdf-zoom-out': 'Zoom arrière',
	'pdf-zoom-out-key': '-',
	'pdf-zoom-in': 'Zoom avant',
	'pdf-zoom-in-key': '+',
	'pdf-zoom-menu': 'Zoom autres',
	'pdf-zoom-real': 'Taille réelle',
	'pdf-zoom-fit': 'Page entière',
	'pdf-zoom-fit-key': '0 (zéro)',
	'pdf-zoom-width': 'Pleine largeur',
	'pdf-rotate-ccw': 'Rotation anti-horaire',
	'pdf-rotate-ccw-key': 'Alt ←',
	'pdf-rotate-cw': 'Rotation horaire',
	'pdf-rotate-cw-key': 'Alt →',
	'pdf-about': 'A Propos ...',
	'pdf-about-controls': 'Contrôles',
	'pdf-about-function': 'Fonction',
	'pdf-about-keyboard': 'Clavier',
	'pdf-about-properties': 'Propriétés',
	'pdf-about-property': 'Propriété',
	'pdf-about-value': 'Valeur',

	'pdf-metadata': {
		'Title': 'Titre',
		'Author': 'Auteur',
		'Subject': 'Sujet',
		'Keywords': 'Mots-clefs',
		'CreationDate': 'Créé le',
		'ModDate': 'Modifié le',
		'Creator': 'Créé par',
		'Producer': 'Logiciel',
		'PDFFormatVersion': 'Version'
	},
};

PDFLang['en'] = {
	'pdf-action-text-format': '%T% ("%K%" key)',
	'pdf-open-file': 'Open file...',
	'pdf-open-url': 'Open URL...',
	'pdf-page-first': 'First page',
	'pdf-page-first-key': 'Home',
	'pdf-page-previous': 'Previous page',
	'pdf-page-previous-key': 'Page up',
	'pdf-page-next': 'Next page',
	'pdf-page-next-key': 'Page down',
	'pdf-page-last': 'Last page',
	'pdf-page-last-key': 'End',
	'pdf-page-numbering': 'Page %PN% of %PC%',
	'pdf-zoom-out': 'Zoom out',
	'pdf-zoom-out-key': '-',
	'pdf-zoom-in': 'Zoom in',
	'pdf-zoom-in-key': '+',
	'pdf-zoom-menu': 'Zoom menu',
	'pdf-zoom-real': 'Real size',
	'pdf-zoom-fit': 'Fit to page',
	'pdf-zoom-fit-key': '0 (zero)',
	'pdf-zoom-width': 'Fit to width',
	'pdf-rotate-ccw': 'Counter-clockwise rotation',
	'pdf-rotate-ccw-key': 'Alt ←',
	'pdf-rotate-cw': 'Clockwise rotation',
	'pdf-rotate-cw-key': 'Alt →',
	'pdf-about': 'About...',
	'pdf-about-controls': 'Controls',
	'pdf-about-function': 'Function',
	'pdf-about-keyboard': 'Keyboard',
	'pdf-about-properties': 'Properties',
	'pdf-about-property': 'Property',
	'pdf-about-value': 'Value',

	'pdf-metadata': {
		'Title': 'Title',
		'Author': 'Author',
		'Subject': 'Subject',
		'Keywords': 'Keywords',
		'CreationDate': 'Creation',
		'ModDate': 'Modification',
		'Creator': 'Creator',
		'Producer': 'Producer',
		'PDFFormatVersion': 'Version'
	},
};

function PDFViewer(container, lang) {
	// load, loaded, scalechanged, pagechanged
	this.container = container.addClass('pdf-container');
	this.lang = lang;
	this.pdf = null;
	this.pageIndex = 1;
	this.pageRendering = false;
	this.pageIndexPending = null;
	this.scale = 80;
	this.rotation = 0;
	this.canvas = $('<canvas />').appendTo(this.container)[0];
	this.canvasContext = this.canvas.getContext('2d');

	// Contrôles au clavier
	$(document.body).on('keypress', this.onkeypress.bind(this));
	// Drop de fichiers
	this.container.on('dragenter dragover', function(event) {
		event.preventDefault();
	}).on('drop', (function(event) {
		event.preventDefault();
		this.loadFile(event.originalEvent.dataTransfer.files[0]);
	}).bind(this));

}

/** Cette méthode lance l'évènement demandé, prévenant ainsi d'éventuels listeners */
PDFViewer.prototype.trigger = function(event, extraParameters) {
	$(this).trigger(event, extraParameters);
};

/** Cette méthode enregistre un nouveau listener pour l'évènement indiqué */
PDFViewer.prototype.on = function(events, handler, data) {
	if (typeof data === 'object')
		$(this).on(events, data, handler);
	else
		$(this).on(events, handler);
};

/** Cette fonction parse une date telle que retournée par le fichier PDF */
PDFViewer.prototype.parsePDFDate = function(s) {
	var text = s;
	if (!text)
		return undefined;
	// Remove the D: prefix if it is available.
	if (text.substring(0,2) === 'D:')
		text = text.substring(2);
	// Get all elements from the PDF date string.
	var year = parseInt(text.substring(0,4));
	var month = parseInt(text.substring(4,6)) - 1;
	var day = parseInt(text.substring(6,8));
	var hours = parseInt(text.substring(8,10));
	var minutes = parseInt(text.substring(10,12));
	var seconds = parseInt(text.substring(12,14));
	var utRel = text.substring(14,15);
	var offsetHours = parseInt(text.substring(15,17));
	var offsetMinutes = parseInt(text.substring(18,20));
	// Deal with timezone
	if (utRel === '-') {
		hours += offsetHours;
		minutes += offsetMinutes;
	} else if (utRel === '+') {
		hours -= offsetHours;
		minutes -= offsetMinutes;
	}
	return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
};

PDFViewer.prototype.getPageIndex = function() {
	return (typeof this.pdf === 'undefined') ? 0 : this.pageIndex;
};

PDFViewer.prototype.getPageCount = function() {
	return (typeof this.pdf === 'undefined') ? 0 : this.pdf.numPages;
};

PDFViewer.prototype.getScale = function() {
	return this.scale;
};

PDFViewer.prototype.getRotation = function() {
	return this.rotation;
};

/** Cette méthode charge le document PDF à l'URL indiquée */
PDFViewer.prototype.loadURL = function(url) {
	var viewer = this;
	viewer.trigger('load', {
		url: url
	});
	PDFJS.getDocument(url).then(function(pdfDoc) {
		viewer.pdf = pdfDoc;
		viewer.trigger('loaded', {
			pageCount: viewer.pdf.numPages
		});

		viewer.renderPage(1);
	});
};

/** Cette méthode charge le fichier PDF indiqué, obtenu par exemple via une input[file] ou un DnD */
PDFViewer.prototype.loadFile = function(file) {
	var viewer = this;
	var reader = new FileReader();
	viewer.trigger('load', {
		file: file
	});
	reader.onload = function(e) {
		var url = e.target.result;
		viewer.loadURL(url);
	};
	reader.readAsDataURL(file);
};

/** Cette méthode charge à la demande les méta-données du document PDF et appelle le consumer à chaque couple (nom, libellé, valeur) */
PDFViewer.prototype.getMetadata = function(consumer) {
	var viewer = this;
	viewer.pdf.getMetadata().then(function(data) {
		// console.log(data);
		var langs = viewer.lang['pdf-metadata'];
		for (var property in langs) {
			var value = data.info[property];
			if (property.indexOf('Date') === property.length - 4)
				value = viewer.parsePDFDate(value);
			consumer(property, langs[property], value);
		}
	});
};

/** Cette méthode demande à revenir à la première page */
PDFViewer.prototype.renderFirstPage = function() {
	if (this.pageIndex > 1)
		this.renderPage(1);
};

/** Cette méthode demande à revenir à la page précédente */
PDFViewer.prototype.renderPreviousPage = function() {
	if (this.pageIndex > 1)
		this.renderPage(this.pageIndex - 1);
};

/** Cette méthode demande à aller à la page suivante */
PDFViewer.prototype.renderNextPage = function() {
	if (this.pageIndex < this.pdf.numPages)
		this.renderPage(this.pageIndex + 1);
};

/** Cette méthode demande à aller à la dernière page */
PDFViewer.prototype.renderLastPage = function() {
	if (this.pageIndex < this.pdf.numPages)
		this.renderPage(this.pdf.numPages);
};

/** Cette méthode demande à aller à la page indiquée */
PDFViewer.prototype.renderPage = function(pageIndex) {
	var viewer = this;
	if (viewer.pageRendering) {
		// Attendre le fin du chargement de page en cours avant de changer de page
		viewer.pageIndexPending = pageIndex;
	} else {
		// OK, dessiner la page demandée
		viewer.pageRendering = true;
		viewer.pdf.getPage(pageIndex).then(function(page) {
			/*
			console.log(page); // page = { pageIndex: 0, pageInfo: { rotate: 0, view:[t,l,w,h]} }
			page.getTextContent({ normalizeWhitespace: true }).then(function(textContent) {
				console.log(textContent.items); // { width: float, height: float, str: 'text', transform: float[6]}
				console.log($.map(textContent.items, (i) => i.str).join(' '));
			});
			*/

			var viewport = page.getViewport(viewer.scale / 100.0, viewer.rotation);
			viewer.trigger('scalechanged', {
				scale: viewer.scale
			});
			viewer.canvas.height = viewport.height;
			viewer.canvas.width = viewport.width;

			viewer.pageIndex = pageIndex;
			viewer.trigger('pagechanged', {
				pageIndex: pageIndex,
				pageCount: viewer.pdf.numPages
			});

			var renderContext = {
				canvasContext: viewer.canvasContext,
				viewport: viewport
			};
			var renderTask = page.render(renderContext);
			renderTask.promise.then(function() {
				viewer.pageRendering = false;
				if (viewer.pageIndexPending !== null) {
					var n = viewer.pageIndexPending;
					viewer.pageIndexPending = null;
					viewer.renderPage(n);
				}
			});
		});
	}
};

/** Zoomer un peu plus (+10 entre 0 et 100, +20 entre 100 et 200, +30 entre 200 et 300, ...) */
PDFViewer.prototype.zoomIn = function() {
	var increment = (Math.floor(this.scale / 100) + 1) * 10;
	this.changeScale(this.scale + increment);
};

/** Zoomer un peu plus (-10 entre 0 et 100, -20 entre 100 et 200, -30 entre 200 et 300, ...) */
PDFViewer.prototype.zoomOut = function() {
	var decrement = (Math.floor(this.scale / 100) + 1) * 10;
	this.changeScale(Math.max(10, this.scale - decrement));
};

/** Positionner le zoom à 100% (taille réelle) */
PDFViewer.prototype.zoomReal = function() {
	this.changeScale(100);
};

/** Ajuster le zoom pour que la page s'affiche en entière */
PDFViewer.prototype.zoomFit = function() {
	var height = this.container.height(),
		width = this.container.width() - 17/*if scrollbar are visible*/,
		heightFactor = height / this.canvas.height,
		widthFactor = width / this.canvas.width;
	this.changeScale(this.scale * Math.min(widthFactor, heightFactor));
};

/** Ajuster le zoom pour que la page s'affiche en pleine largeur */
PDFViewer.prototype.zoomWidth = function(newWidth) {
	var newWidth = this.container.width() - 17/*if scrollbar are visible*/,
		currentWidth = this.canvas.width,
		currentScale = this.scale;
	this.changeScale(currentScale * newWidth / currentWidth);
};

/** Changer le zoom et redessiner la page */
PDFViewer.prototype.changeScale = function(value) {
	this.scale = value;
	this.renderPage(this.pageIndex);
};

/** Fait pivoter la page dans le sens des aiguilles d'une montre */
PDFViewer.prototype.rotateClockWise = function() {
	this.changeRotation(90);
};

/** Fait pivoter la page dans le sens inverse des aiguilles d'une montre */
PDFViewer.prototype.rotateCounterClockWise = function() {
	this.changeRotation(-90);
};

/** Changer la rotation et redessiner la page */
PDFViewer.prototype.changeRotation = function(offset) {
	this.rotation = (this.rotation + 360 + offset) % 360;
	this.renderPage(this.pageIndex);
};

/** Cette fonction permet de contrôler le PDFViewer au clavier */
PDFViewer.prototype.onkeypress = function(event) {
	if (event.target.tagName === 'INPUT' || event.ctrlKey)
		return;
	var keyCode = event.which || event.keyCode,
		prevent = true;
	switch(keyCode) {
		case 36: // home
			this.renderFirstPage();
			break;
		case 33: // pageup
			this.renderPreviousPage();
			break;
		case 34: // pagedown
			this.renderNextPage();
			break;
		case 35: // end
			this.renderLastPage();
			break;
		case 43: //+
			this.zoomIn();
			break;
		case 45: //-
			this.zoomOut();
			break;
		case 48: //0
			this.zoomFit();
			break;
		case 37: // left
			if (event.altKey)
				this.rotateCounterClockWise();
			else
				prevent = false;
			break;
		case 39: // right
			if (event.altKey)
				this.rotateClockWise();
			else
				prevent = false;
			break;
	default:
		prevent = false;
	}
	if (prevent)
		event.preventDefault();
};

/** Cette fonction affiche dans une fenêtre Modal de Bootstrap les raccourcis clavier et les propriétés du document */
PDFViewer.prototype.showAbout = function() {
	var viewer = this;

	var aboutModal = $(''
		+ '<div id="pdf-about" class="modal fade" tabindex="-1" role="dialog">'
		+ '  <div class="modal-dialog modal-lg">'
		+ '    <div class="modal-content">'
		+ '      <div class="modal-body">'
		+ '        <ul class="nav nav-tabs" role="tablist">'
		+ '          <li role="presentation" class="active"><a href="#pdf-controls" aria-controls="pdf-controls" role="tab" data-toggle="tab">' + viewer.lang['pdf-about-controls']+ '</a></li>'
		+ '          <li role="presentation"><a href="#pdf-metadata" aria-controls="pdf-metadata" role="tab" data-toggle="tab">' + viewer.lang['pdf-about-properties']+ '</a></li>'
		+ '        </ul>'
		+ '        <div class="tab-content">'
		+ '          <div role="tabpanel" id="pdf-controls" class="tab-pane active">'
		+ '            <table class="table">'
		+ '              <thead><tr><th>' + viewer.lang['pdf-about-function']+ '</th><th>' + viewer.lang['pdf-about-keyboard']+ '</th></tr></thead>'
		+ '              <tbody></tbody>'
		+ '            </table>'
		+ '          </div>'
		+ '          <div role="tabpanel" id="pdf-metadata" class="tab-pane">'
		+ '            <table class="table">'
		+ '              <thead><tr><th>' + viewer.lang['pdf-about-property']+ '</th><th>' + viewer.lang['pdf-about-value']+ '</th></tr></thead>'
		+ '              <tbody></tbody>'
		+ '            </table>'
		+ '          </div>'
		+ '        </div>'
		+ '      </div>'
		+ '    </div>'
		+ '  </div>'
		+ '</div>');

	var controlsBody = aboutModal.find('#pdf-controls > table > tbody');
	['pdf-page-first', 'pdf-page-previous', 'pdf-page-next', 'pdf-page-last', 'pdf-zoom-in', 'pdf-zoom-out', 'pdf-zoom-fit', 'pdf-rotate-ccw', 'pdf-rotate-cw'].forEach(function(name, index) {
		var key = viewer.lang[name + '-key'];
		if (!!key)
			$('<tr />').append('<td>' + viewer.lang[name] + '</td>').append('<td><code>' + key + '</code></td>').appendTo(controlsBody);
	});

	var metadataBody = aboutModal.find('#pdf-metadata > table > tbody');
	viewer.getMetadata(function(property, name, value) {
		$('<tr />').append('<td>' + name + '</td>').append('<td>' + (value || '') + '</td>').appendTo(metadataBody);
	});

	aboutModal.appendTo(document.body).modal('show').on('hidden.bs.modal', function() {
		aboutModal.remove();
	});
};

/** Cette classe facilite la création d'une barre d'outils permettant la manipulation d'un PDFViewer */
function PDFToolbar(viewer, container, lang, options) {
	this.viewer = viewer;
	this.container = container.addClass('pdf-toolbar');
	this.lang = lang;

	// Ouverture d'un fichier local
	this.openFileButton = this.buildButton('pdf-open-file', 'glyphicon-open-file').click((function() {
		this.openFileInput.click()
	}).bind(this));
	this.openFileInput = $('<input class="pdf-open-file" type="file" accept=".pdf" style="display: none;" />').change((function(event) {
		var files = event.target.files;
		if (files && files.length > 0)
			this.viewer.loadFile(files[0]);
	}).bind(this));

	// Ouverture d'une URL
	this.openURLButton = this.buildButton('pdf-open-url', 'glyphicon-cloud-upload').click((function() {
		var url = window.prompt('URL', '');
		if (url)
			this.viewer.loadURL(url);
	}).bind(this));

	// Bouton "Première page"
	this.pageFirstButton = this.buildButton('pdf-page-first', 'glyphicon-step-backward').click(this.viewer.renderFirstPage.bind(this.viewer));
	// Bouton précédent
	this.pagePreviousButton = this.buildButton('pdf-page-previous', 'glyphicon-backward').click(this.viewer.renderPreviousPage.bind(this.viewer));
	// Bouton suivant
	this.pageNextButton = this.buildButton('pdf-page-next', 'glyphicon-forward').click(this.viewer.renderNextPage.bind(this.viewer));
	// Bouton "Dernière page"
	this.pageLastButton = this.buildButton('pdf-page-last', 'glyphicon-step-forward').click(this.viewer.renderLastPage.bind(this.viewer));

	// Numérotation des pages
	this.pageSpan = $('<span class="btn">' + (lang['pdf-page-numbering'] || '%PN% / %PC%').replace('%PN%', '<input type="text" style="width: 33px; border: 0; text-align: center; " />').replace('%PC%', '<span></span>') + '</span>');
	// Numéro de page modifiable
	this.pageNumberInput = this.pageSpan.children('input').change((function(event) {
		var num = parseInt(event.target.value);
		if (num != this.viewer.getPageIndex() && num >= 1 && num <= this.viewer.getPageCount())
			this.viewer.renderPage(num);
	}).bind(this));
	this.pageCountSpan = this.pageSpan.children('span');

	// Bouton "Zoom -"
	this.zoomOutButton = this.buildButton('pdf-zoom-out', 'glyphicon-minus').click(this.viewer.zoomOut.bind(this.viewer));
	// Bouton "Zoom +"
	this.zoomInButton = this.buildButton('pdf-zoom-in', 'glyphicon-plus').click(this.viewer.zoomIn.bind(this.viewer));
	// Bouton dropdown Zoom autres
	this.zoomMenu = this.buildButton('pdf-zoom-menu').addClass('dropdown-toggle').attr('data-toggle', 'dropdown').append('<span></span>&nbsp;%&nbsp;<span class="caret"></span>');
	// Span où l'on affiche le zoom actuel
	this.scaleSpan = this.zoomMenu.children('span:not(.caret)');
	// Bouton "Taille réelle"
	this.zoomRealButton = this.buildMenuLI('pdf-zoom-real').click(this.viewer.zoomReal.bind(this.viewer));
	// Bouton "Page entière"
	this.zoomFitButton = this.buildMenuLI('pdf-zoom-fit').click(this.viewer.zoomFit.bind(this.viewer));
	// Bouton "Pleine largeur"
	this.zoomWidthButton = this.buildMenuLI('pdf-zoom-width').click(this.viewer.zoomWidth.bind(this.viewer));
	// Boutons ".. %"
	this.zoomPctButtons = [50, 75, 100, 125, 150, 200, 300, 400].map(function(pct) { return '<li><a href="#" class="pdf-zoom-pct" data-value="' + pct + '">' + pct + ' %</a></li>'; });
	this.container.on('click', 'a.pdf-zoom-pct', (function(event) {
		this.viewer.changeScale(parseInt($(event.target).attr('data-value')));
	}).bind(this));

	// Bouton "Rotation anti-horaire"
	this.rotateCCWButton = this.buildButton('pdf-rotate-ccw', 'glyphicon-share-alt').click(this.viewer.rotateCounterClockWise.bind(this.viewer));
	this.rotateCCWButton.children('.glyphicon').css('transform', 'scaleX(-1)');
	// Bouton "Rotation horaire"
	this.rotateCWButton = this.buildButton('pdf-rotate-cw', 'glyphicon-share-alt').click(this.viewer.rotateClockWise.bind(this.viewer));

	// Bouton "à propos"
	this.aboutButton = this.buildButton('pdf-about', 'glyphicon-question-sign').click(this.viewer.showAbout.bind(this.viewer));

	// Remplissage de la barre
	if (options.showOpenFile)
		this.container.append(this.openFileButton).append(this.openFileInput);
	if (options.showOpenURL)
		this.container.append(this.openURLButton);
	this.container.append(this.pageFirstButton);
	this.container.append(this.pagePreviousButton);
	this.container.append(this.pageSpan);
	this.container.append(this.pageNextButton);
	this.container.append(this.pageLastButton);
	this.container.append(this.zoomOutButton);
	this.container.append($('<div class="btn-group" role="group" />')
		.append(this.zoomMenu)
		.append($('<ul class="dropdown-menu" />')
			.append(this.zoomRealButton)
			.append(this.zoomFitButton)
			.append(this.zoomWidthButton)
			.append('<li role="separator" class="divider"></li>')
			.append(this.zoomPctButtons)
		)
	);
	this.container.append(this.zoomInButton);
	this.container.append(this.rotateCCWButton);
	this.container.append(this.rotateCWButton);
	if (options.showAbout)
		this.container.append(this.aboutButton);

	// Register listeners on "viewer" to update "toolbar"
	this.viewer.on('loaded', this.onviewerloaded.bind(this));
	this.viewer.on('scalechanged', this.onviewerscalechanged.bind(this));
	this.viewer.on('pagechanged', this.onviewerpagechanged.bind(this));
}

PDFToolbar.prototype.onviewerloaded = function(event, data) {
	this.pageCountSpan.text(data.pageCount);
};

PDFToolbar.prototype.onviewerscalechanged = function(event, data) {
	this.scaleSpan.text(Math.floor(data.scale));
};

PDFToolbar.prototype.onviewerpagechanged = function(event, data) {
	var pageIndex = data.pageIndex, pageCount = data.pageCount;
	this.pageNumberInput.val(pageIndex.toString());
	this.pageFirstButton.prop('disabled', pageIndex == 1);
	this.pagePreviousButton.prop('disabled', pageIndex == 1);
	this.pageNextButton.prop('disabled', pageIndex == pageCount);
	this.pageLastButton.prop('disabled', pageIndex == pageCount);
};

PDFToolbar.prototype.buildButton = function(name, glyphicon) {
	var text = this.lang[name] || '';
	var key = this.lang[name + '-key'];
	if (key)
		text = this.lang['pdf-action-text-format'].replace('%T%', text).replace('%K%', key);
	return $('<button type="button" class="btn btn-default" />')
		.addClass(name)
		.attr('title', text)
		.html(glyphicon ? '<span class="glyphicon ' + glyphicon + '"></span>' : '');
};

PDFToolbar.prototype.buildMenuLI = function(name) {
	var text = this.lang[name] || '';
	var key = this.lang[name + '-key'];
	if (key)
		text = this.lang['pdf-action-text-format'].replace('%T%', text).replace('%K%', key);
	return $('<li />').append($('<a href="#" />')
		.addClass(name)
		.html(text));
};

