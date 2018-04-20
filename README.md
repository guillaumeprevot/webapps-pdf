# webapps-pdf

A simple PDF viewer using [PDF.js](http://mozilla.github.io/pdf.js/) from [Mozilla](https://www.mozilla.org/fr/)

## Présentation

[Cette application](https://techgp.fr/webapps/webapps-pdf.html) écrite en HTML5, JavaScript et CSS3 vous permet de visualiser des fichiers PDF directement dans votre navigateur.

Les librairies suivantes ont été utilisées pour cette application :

- [PDF.js 1.9.426](http://mozilla.github.io/pdf.js/) sous licence Apache 2
- [jQuery 3.3.1](http://jquery.com/) sous licence MIT
- [Bootstrap 3.3.7](http://getbootstrap.com/css/) sous licence MIT

L'application devrait fonctionner correctement est mode déconnecté grâce aux **Service Workers** sous Chrome, Firefox et [d'autres bientôt](https://caniuse.com/#search=service+worker).
Plus d'infos chez [Google](https://developers.google.com/web/fundamentals/primers/service-workers/) ou [Mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Captures d'écran

### Présentation de l'IHM

![Présentation de l'IHM](./screenshots/webapps-pdf-1.png)

## Licence

Ce projet est distribué sous licence MIT, reproduite dans le fichier LICENSE ici présent.

## Changelog

2016-03-25
- première version

2016-05-18
- refactoring sous la forme d'un couple de composant PDFViewer / PDFToolbar
- récupération de la langue du navigateur pour proposer le français ou l'anglais par défaut
- correction du style CSS pour mieux aligner les composants de la barre d'outils
- mise à jour de jQuery (2.2.2 vers 2.2.3) et PDF.js (1.3.91 vers 1.5.188)

2016-06-14
- récupération du texte de la page affichée pour permettre la recherche et la sélection.
- LIMITATION : texte justifié ou avec tabulation mal dimensionné. Voir si on ne pourrait demander à PDF.js d'énumérer les éléments dessinés sur le canvas au fur et à mesure.

2016-06-28
- ajout du fichier LICENCE

2016-07-16
- mise à jour de jQuery (2.2.3 vers 2.2.4)

2017-05-21
- ajout de la font glyphicons à AppCache
- mise à jour de jQuery (2.2.4 en 3.2.1), Bootstrap (3.3.6 en 3.3.7) et PDF.js (1.5.188 en 1.7.225)

2017-07-15
- correction de l'affichage des pages pivotées dans certains fichiers PDF 

2018-04-02
- personnalisation par l'URL de l'affichage de certains boutons (showOpenFile, showOpenURL et showAbout)
- possibilité d'ouvrir automatiquement une URL via le paramètre "loadURL" (ex: loadURL=.%2Ftest%2Ftest-pdf.pdf)
- possibilité d'afficher un bouton de retour vers une URL donnée "fromURL" ayant pour titre "fromTitle" (icône fixe)
- possibilité de passer tous ces paramètres par le hash, par exemple btoa(JSON.stringify({loadURL: ..., fromURL: ..., ...}))
- mise à jour de jQuery (3.2.1 en 3.3.1) et PDF.js (1.7.225 en 1.9.426)

2018-04-06
- utilisation des Service Workers pour la mise en cache au lieu de [Application Cache](https://developer.mozilla.org/fr/docs/Utiliser_Application_Cache)
- retouche de la largeur des colonnes dans la fenêtre modale (bouton "?")
- contrôle au clavier basé sur "event.key" plutôt que "event.keyCode" car plus lisible

2018-04-20
- correction de la hauteur du bouton "Retour" quand l'option "fromURL" est utilisée
