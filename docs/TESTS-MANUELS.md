# Tests manuels

Prérequis : backend démarré (`npm start` dans `backend/`) et frontend démarré (`npm run dev` dans `frontend/`).

## Tests système (frontend + backend)

| N° | Étapes | Résultat attendu |
| --- | --- | --- |
| T1 | Ouvrir `/recettes` | La liste affiche 23 recettes avec prix, coût, marge et portions possibles |
| T2 | Taper « cesar » dans la recherche | Seule la Salade César reste (les accents sont ignorés) |
| T3 | Choisir la catégorie « Dessert » puis « Marge la plus haute » | Seuls des desserts, du plus au moins rentable |
| T4 | Cliquer sur une recette | Détail : coût ligne par ligne, total, stock de chaque ingrédient |
| T5 | Page Stock → « Ajouter un ingrédient » → Enregistrer sans rien remplir | Les champs fautifs sont indiqués, rien n'est envoyé |
| T6 | Remplir correctement le formulaire → Enregistrer | Message de confirmation, l'ingrédient apparaît dans le tableau |
| T7 | Modifier le stock d'un ingrédient sous son seuil | Le statut passe à « OK » ; le tableau de bord se met à jour |
| T8 | Supprimer « Tomate » | Refusé : message indiquant que 3 recettes l'utilisent |
| T9 | Supprimer l'ingrédient ajouté en T6 | Il disparaît de la liste |
| T10 | Arrêter le backend, recharger une page | Message « Impossible de joindre le serveur » avec bouton « Réessayer » ; l'application ne plante pas |
| T11 | Page `/inexistante` | Retour au tableau de bord |
| T12 | Faire défiler une page longue (Stock) sur ordinateur et sur mobile | La barre du haut reste visible |
| T13 | Ordinateur : cliquer sur le burger | Les liens disparaissent de la barre ; un second clic les fait réapparaître |
| T14 | Mobile (ou fenêtre étroite, moins de 768 px) : cliquer sur le burger, puis sur « Recettes » | Un panneau s'ouvre sous la barre ; après le clic, la page change et le panneau se referme |
| T15 | Page Recettes : survoler « Impossible » (Tiramisu) | Infobulle : liste de tous les ingrédients manquants (Biscuits boudoirs : en rupture, quantité requise par portion) et des autres ingrédients bas |
| T16 | Page Recettes : survoler un triangle jaune | Infobulle : ingrédients bas avec leur stock et leur seuil |
| T17 | Tableau de bord : section « Recettes à surveiller » | Tiramisu en rouge, les recettes à stock bas en jaune ; infobulle au survol |
| T18 | Réapprovisionner « Biscuits boudoirs » et « Mascarpone » (page Stock) | Le Tiramisu disparaît de « Recettes à surveiller » et du tag « Impossible » |
| T19 | Regarder l'onglet du navigateur | L'icône du site (cloche de service sur fond orange) s'affiche (si l'ancienne reste, faire Ctrl+F5) |
| T20 | Page Stock sur ordinateur | Le bouton « Ajouter un ingrédient » est sur la même ligne que « Stock bas seulement », à droite |
| T21 | Page Stock sur mobile (moins de 640 px) | Rechercher, puis Catégorie en dessous, puis le bouton « Ajouter », plus haut mais pas plus large |
| T22 | Tableau de bord sur ordinateur | « Recettes les plus rentables » et « Coût matière » sont sur deux lignes séparées ; les barres des catégories commencent près des noms |
| T23 | Page Recettes : taper `tomate` dans la recherche | Les recettes qui contiennent de la tomate s'affichent, avec « Contient : … » sous le nom |
| T24 | Taper `tomate, basilic` | Seules les recettes qui contiennent les deux ingrédients restent |
| T25 | Page Stock : cliquer sur le nombre de la colonne « Recettes » de la Tomate (3) | Page Recettes, recherche `"Tomate"` déjà remplie, exactement 3 recettes |
| T26 | Page Stock : ajouter un ingrédient avec le coût `1.05`, puis un autre avec `1,05` | Les deux sont acceptés et affichés « 1,05 $ » |
| T27 | Page Stock sur ordinateur : regarder la rangée des filtres | Champs, case « Stock bas seulement » et bouton « Ajouter un ingrédient » sont centrés sur la même ligne |

## Tests utilisateurs (2 personnes, sans aide)

| N° | Scénario | Critère de réussite |
| --- | --- | --- |
| S1 | Trouver la recette la plus rentable de la catégorie « Plat » | Trouvée en moins de 1 minute |
| S2 | Ajouter un ingrédient, puis modifier son stock | L'ingrédient apparaît dans la liste après l'ajout |
| S3 | Repérer les ingrédients à commander | Les alertes de stock bas sont trouvées sans aide |

Noter pour chaque personne : ce qu'elle fait, ce qui la bloque, et sa réponse à « était-ce clair ? ».

## Résultats

À compléter après les tests.

## Tests manuels — ronde 4 (30 octobre)

1. **Stock › recherche par recette** : taper `Pizza Margherita` → seuls ses ingrédients s'affichent, avec « Utilisé dans : Pizza Margherita » sous chaque nom. Taper `tomate` → ingrédients dont le nom contient « tomate ».
2. **Bouton g/ml ↔ kg/L** (Stock, détail d'une recette, tableau de bord) : 1 500 g devient 1,5 kg ; le coût passe de $/g à $/kg ; le choix est gardé au rechargement.
3. **Catégorie / fournisseur par prononciation** (formulaire d'ingrédient) : taper `Legum` → « Légumes » proposé ; taper `Ferm du Lak` → « Ferme du Lac » (« Vouliez-vous dire … ? »). Taper `epicerie` puis enregistrer → réutilise « Épicerie ».
4. **Ajouter une recette** (Recettes › Ajouter une recette) : champs vides → erreurs ; nom déjà utilisé → erreur du serveur ; succès → retour à la liste avec message. Supprimer depuis la page de détail de la recette.
5. **Mise en page** : cocher/décocher « Stock bas seulement », changer la catégorie des recettes, passer de page en page → rien ne se décale, aucun texte « (mise à jour…) ».
6. **Tableau de bord** : deux graphiques côte à côte sur grand écran, liens en pilules, plus d'espace entre les barres.
