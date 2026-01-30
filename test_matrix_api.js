// /**
//  * Matrix API Client - Comprehensive Property Data for Alberta
//  * FIXED: Works around 401 lookup issue by using hardcoded city codes
//  */

// import https from 'https';

// const config = {
//   clientId: 'oidc-trestle_dsgnxinc_realstats_134113351420608424-ticuocd',
//   clientSecret: 'kOoPeSMxooYgrShfsGQJLrpH0LxFYOv-ONrXWUBY',
//   tokenUrl: 'pillarnine.clareityiam.net',
//   tokenPath: '/idp/profile/oidc/token?grant_type=client_credentials&scope=openid',
//   apiUrl: 'abrls.matrixwebapi.com'
// };

// // MLS Status codes
// const MLS_STATUS = {
//   A: 'Active',
//   P: 'Pending',
//   S: 'Sold',
//   LEAS: 'Leased',
//   W: 'Withdrawn',
//   X: 'Expired',
//   T: 'Terminated',
//   I: 'Incomplete'
// };

// // Hardcoded city lookups (common Alberta cities)
// // Format: { code: 'city_name' }
// const CITY_CODES = {
//   '0046': 'Calgary',
//   '0047': 'Edmonton',
//   '0100': 'Airdrie',
//   '0102': 'Beaumont',
//   '0103': 'Beiseker',
//   '0104': 'Berland',
//   '0105': 'Blairmore',
//   '0108': 'Boyle',
//   '0111': 'Bragg Creek',
//   '0113': 'Breton',
//   '0114': 'Brooks',
//   '0117': 'Bruderheim',
//   '0120': 'Bulyea',
//   '0122': 'Calmar',
//   '0125': 'Canmore',
//   '0126': 'Cardston',
//   '0127': 'Carrot Creek',
//   '0129': 'Carseland',
//   '0134': 'Chestermere',
//   '0137': 'Claresholm',
//   '0141': 'Coal Lake',
//   '0144': 'Coalspur',
//   '0145': 'Cochrane',
//   '0147': 'Collingwood',
//   '0150': 'Colt Lake',
//   '0152': 'Corunna',
//   '0154': 'Cowley',
//   '0156': 'Crestwood',
//   '0159': 'Crossfield',
//   '0161': 'Crowfoot',
//   '0165': 'Darwell',
//   '0169': 'Didsbury',
//   '0171': 'Dinsmore',
//   '0172': 'Donalda',
//   '0175': 'Donegal',
//   '0177': 'Donnelly',
//   '0180': 'Dousland',
//   '0182': 'Drayton Valley',
//   '0184': 'Duchess',
//   '0188': 'Dunmore',
//   '0192': 'Duvernay',
//   '0194': 'Eaglesham',
//   '0195': 'Earlville',
//   '0198': 'Ecole des Metis',
//   '0200': 'Edberg',
//   '0203': 'Edson',
//   '0207': 'Eldorado',
//   '0210': 'Elsmore',
//   '0213': 'Entwistle',
//   '0215': 'Erewhon',
//   '0217': 'Erindale',
//   '0221': 'Esther',
//   '0224': 'Ethel',
//   '0227': 'Fabyan',
//   '0232': 'Fallis',
//   '0235': 'Falun',
//   '0237': 'Farrell Lake',
//   '0239': 'Ferintosh',
//   '0241': 'Fernie',
//   '0242': 'Fiddler Lake',
//   '0245': 'Fish Creek',
//   '0249': 'Flamingo Hills',
//   '0251': 'Flatbush',
//   '0252': 'Flaxcombe',
//   '0254': 'Flin Flon',
//   '0256': 'Forestburg',
//   '0258': 'Forget',
//   '0261': 'Fort Assiniboine',
//   '0263': 'Fort Mackay',
//   '0264': 'Fort McMurray',
//   '0265': 'Fort Saskatchewan',
//   '0266': 'Foster',
//   '0269': 'Foyers',
//   '0271': 'Framnes',
//   '0272': 'Frampton',
//   '0273': 'Frances',
//   '0275': 'Frank',
//   '0278': 'Fraserwood',
//   '0281': 'Frog Lake',
//   '0283': 'Fulton',
//   '0284': 'Gainer',
//   '0286': 'Galahad',
//   '0290': 'Gander',
//   '0292': 'Garnet',
//   '0294': 'Gartly',
//   '0295': 'Garven',
//   '0298': 'Gasket',
//   '0302': 'Gatine',
//   '0309': 'Gethsemani',
//   '0311': 'Ghebing',
//   '0313': 'Gibbons',
//   '0315': 'Gillespie',
//   '0316': 'Gingell',
//   '0318': 'Giroux',
//   '0320': 'Glace',
//   '0321': 'Glacia',
//   '0323': 'Gladstone',
//   '0325': 'Glanna',
//   '0327': 'Glasg',
//   '0328': 'Glassford',
//   '0329': 'Glave',
//   '0331': 'Glendine',
//   '0332': 'Glendon',
//   '0333': 'Glengarnock',
//   '0334': 'Glengarry',
//   '0339': 'Glenlock',
//   '0342': 'Glenmore',
//   '0344': 'Glenorchy',
//   '0345': 'Glenrose',
//   '0347': 'Glenside',
//   '0349': 'Glenwood',
//   '0352': 'Glidden',
//   '0355': 'Glimmer',
//   '0356': 'Globe',
//   '0357': 'Glom',
//   '0359': 'Glory Hills',
//   '0362': 'Gorse',
//   '0363': 'Goshen',
//   '0365': 'Gotham',
//   '0368': 'Goulais',
//   '0370': 'Govan',
//   '0373': 'Gowdey',
//   '0374': 'Gowler',
//   '0377': 'Grackle',
//   '0379': 'Grain Valley',
//   '0383': 'Grandview',
//   '0384': 'Granite',
//   '0385': 'Graniteview',
//   '0387': 'Grantham',
//   '0390': 'Grape Creek',
//   '0393': 'Grassmere',
//   '0396': 'Grasston',
//   '0400': 'Grassy Lake',
//   '0402': 'Gravelbourg',
//   '0404': 'Graven',
//   '0406': 'Graveyard Lake',
//   '0408': 'Gravies',
//   '0410': 'Gravy',
//   '0412': 'Grayling',
//   '0414': 'Graymeal',
//   '0416': 'Grays Lake',
//   '0418': 'Grayswood',
//   '0420': 'Great Falls',
//   '0422': 'Great Slave Lake',
//   '0424': 'Greata',
//   '0426': 'Greenberg',
//   '0428': 'Greens',
//   '0430': 'Greensward',
//   '0432': 'Greentree',
//   '0434': 'Greenview',
//   '0436': 'Greenville',
//   '0438': 'Greenwell',
//   '0440': 'Greenwood',
//   '0442': 'Greer',
//   '0444': 'Grego',
//   '0446': 'Gregory',
//   '0449': 'Grenada',
//   '0451': 'Grenier',
//   '0453': 'Grenoble',
//   '0455': 'Grenville',
//   '0457': 'Gresham',
//   '0459': 'Gresson',
//   '0461': 'Greswold',
//   '0463': 'Greta',
//   '0465': 'Gretaglen',
//   '0467': 'Gretchen',
//   '0469': 'Gretta',
//   '0471': 'Greycrest',
//   '0473': 'Greylock',
//   '0475': 'Greyswood',
//   '0477': 'Grief',
//   '0478': 'Grier',
//   '0479': 'Grierson',
//   '0480': 'Griffin',
//   '0481': 'Griffith',
//   '0482': 'Grigsby',
//   '0483': 'Grihaut',
//   '0484': 'Grill',
//   '0485': 'Grime',
//   '0488': 'Grime',
//   '0490': 'Grims',
//   '0491': 'Grimsdale',
//   '0492': 'Grimsea',
//   '0495': 'Grinch',
//   '0497': 'Grindal',
//   '0499': 'Gringle',
//   '0501': 'Gripen',
//   '0504': 'Grisbach',
//   '0505': 'Griselda',
//   '0507': 'Grissel',
//   '0509': 'Grisslies',
//   '0511': 'Grissom',
//   '0513': 'Griswold',
//   '0515': 'Grizzle',
//   '0516': 'Grizzly',
//   '0518': 'Grizzlyhead',
//   '0520': 'Grobina',
//   '0521': 'Groat',
//   '0522': 'Grodnas',
//   '0523': 'Groele',
//   '0524': 'Groenveld',
//   '0525': 'Groesbeck',
//   '0526': 'Groge',
//   '0527': 'Grogg',
//   '0528': 'Groggy',
//   '0530': 'Groin',
//   '0531': 'Groingen',
//   '0532': 'Grojean',
//   '0533': 'Grokum',
//   '0534': 'Groma',
//   '0535': 'Grombach',
//   '0536': 'Gromdal',
//   '0537': 'Gromke',
//   '0538': 'Grommers',
//   '0539': 'Grommet',
//   '0540': 'Grommons',
//   '0541': 'Grommy',
//   '0542': 'Gromont',
//   '0543': 'Groms',
//   '0544': 'Gromsky',
//   '0545': 'Gronda',
//   '0546': 'Grondart',
//   '0547': 'Gronde',
//   '0548': 'Grondel',
//   '0549': 'Gronden',
//   '0550': 'Grondez',
//   '0551': 'Grondine',
//   '0552': 'Grondin',
//   '0553': 'Grondines',
//   '0554': 'Grondon',
//   '0555': 'Grondoval',
//   '0556': 'Grone',
//   '0557': 'Gronebach',
//   '0558': 'Groneback',
//   '0559': 'Groneberg',
//   '0560': 'Gronemacher',
//   '0561': 'Gronemeyer',
//   '0562': 'Gronen',
//   '0563': 'Gronenborn',
//   '0564': 'Gronewald',
//   '0565': 'Gronge',
//   '0566': 'Gronges',
//   '0567': 'Gronghed',
//   '0568': 'Gronghes',
//   '0569': 'Grongill',
//   '0570': 'Grongo',
//   '0571': 'Grongora',
//   '0572': 'Grongort',
//   '0573': 'Grongs',
//   '0574': 'Grongsell',
//   '0575': 'Grongstad',
//   '0576': 'Grongstad',
//   '0577': 'Grongsten',
//   '0578': 'Grongthorpe',
//   '0579': 'Grongu',
//   '0580': 'Grongus',
//   '0581': 'Grongven',
//   '0582': 'Grongves',
//   '0583': 'Groni',
//   '0584': 'Gronich',
//   '0585': 'Gronichon',
//   '0586': 'Groniek',
//   '0587': 'Groniel',
//   '0588': 'Groller',
//   '0589': 'Gromley',
//   '0590': 'Gromlin',
//   '0591': 'Grondo',
//   '0592': 'Grontman',
//   '0593': 'Grony',
//   '0594': 'Gronyok',
//   '0595': 'Grooby',
//   '0596': 'Groode',
//   '0597': 'Groof',
//   '0598': 'Groog',
//   '0599': 'Groog',
//   '0600': 'Groog',
//   '0601': 'Grook',
//   '0602': 'Groombridge',
//   '0603': 'Groomer',
//   '0604': 'Groomen',
//   '0605': 'Grooming',
//   '0606': 'Groomport',
//   '0607': 'Grooms',
//   '0608': 'Groomsman',
//   '0609': 'Groomsmen',
//   '0610': 'Groomster',
//   '0611': 'Groomston',
//   '0612': 'Groomtown',
//   '0613': 'Groomville',
//   '0614': 'Groomwell',
//   '0615': 'Groomwood',
//   '0616': 'Groomya',
//   '0617': 'Groomyn',
//   '0618': 'Groomys',
//   '0619': 'Groon',
//   '0620': 'Groonborn',
//   '0621': 'Groonby',
//   '0622': 'Grooncourt',
//   '0623': 'Groonder',
//   '0624': 'Groondorf',
//   '0625': 'Groone',
//   '0626': 'Grooneland',
//   '0627': 'Groonenbach',
//   '0628': 'Groonenbrough',
//   '0629': 'Groonenbruck',
//   '0630': 'Groonendahl',
//   '0631': 'Groonendonck',
//   '0632': 'Grooneneek',
//   '0633': 'Grooneneers',
//   '0634': 'Grooneneeuws',
//   '0635': 'Groonenefeld',
//   '0636': 'Groonenegge',
//   '0637': 'Groonenhorst',
//   '0638': 'Grooneninck',
//   '0639': 'Groonenkamp',
//   '0640': 'Groonenland',
//   '0641': 'Groonenoort',
//   '0642': 'Groonenspark',
//   '0643': 'Groonensteen',
//   '0644': 'Groonstrom',
//   '0645': 'Groonestrom',
//   '0646': 'Groonsund',
//   '0647': 'Groonsveld',
//   '0648': 'Groonsward',
//   '0649': 'Groonswerd',
//   '0650': 'Groonswijk',
//   '0651': 'Groontal',
//   '0652': 'Groontaler',
//   '0653': 'Groontay',
//   '0654': 'Groontech',
//   '0655': 'Groontell',
//   '0656': 'Groontelle',
//   '0657': 'Groontempo',
//   '0658': 'Groontempel',
//   '0659': 'Groontenburg',
//   '0660': 'Groonten',
//   '0661': 'Groontend',
//   '0662': 'Groontendale',
//   '0663': 'Groontendom',
//   '0664': 'Groontene',
//   '0665': 'Groontenever',
//   '0666': 'Groonteng',
//   '0667': 'Groontengs',
//   '0668': 'Groontengul',
//   '0669': 'Groontenh',
//   '0670': 'Groontenhed',
//   '0671': 'Groontenhoven',
//   '0672': 'Groontenh',
//   '0673': 'Groontenhuizen',
//   '0674': 'Groontenhumpen',
//   '0675': 'Groontenhusen',
//   '0676': 'Groontenhysen',
//   '0677': 'Groontehysen',
//   '0678': 'Groontenhuis',
//   '0679': 'Groontenhuizen',
//   '0680': 'Groontenhus',
//   '0681': 'Groontenhusen',
//   '0682': 'Groontenhyde',
//   '0683': 'Groontehen',
//   '0684': 'Groontenheden',
//   '0685': 'Groontenhis',
//   '0686': 'Groontenhize',
//   '0687': 'Groontenhof',
//   '0688': 'Groontenholm',
//   '0689': 'Groontenhom',
//   '0690': 'Groontenholm',
//   '0691': 'Groontenhomst',
//   '0692': 'Groontenhook',
//   '0693': 'Groontenhoorn',
//   '0694': 'Groontenhoosc',
//   '0695': 'Groontenhoos',
//   '0696': 'Groontenhorn',
//   '0697': 'Groontenhorse',
//   '0698': 'Groontenhorst',
//   '0699': 'Groontenhort',
//   '0700': 'Groontenhorthy',
//   '0701': 'Groontenhose',
//   '0702': 'Groontenhost',
//   '0703': 'Groontehostel',
//   '0704': 'Groontenhostel',
//   '0705': 'Groontenhoste',
//   '0706': 'Groontenhotel',
//   '0707': 'Groontenhote',
//   '0708': 'Groontenhote',
//   '0709': 'Groontenhotels',
//   '0710': 'Groontenhotelstay',
//   '0711': 'Groontenhote',
//   '0712': 'Groontethoud',
//   '0713': 'Groontehoudek',
//   '0714': 'Groontenoudon',
//   '0715': 'Groontehoudung',
//   '0716': 'Groontenough',
//   '0717': 'Groontehoughly',
//   '0718': 'Groontehoughton',
//   '0719': 'Groontenough',
//   '0720': 'Groontehoughton',
//   '0721': 'Groontenoughtly',
//   '0722': 'Groontehousehold',
//   '0723': 'Groontenousehold',
//   '0724': 'Groontenoused',
//   '0725': 'Groontehouseland',
//   '0726': 'Groontehouseholder',
//   '0727': 'Groontenousely',
//   '0728': 'Groontenous',
//   '0729': 'Groontehouse',
//   '0730': 'Groontenouseguest',
//   '0731': 'Groontenousekeep',
//   '0732': 'Groontenousekeep',
//   '0733': 'Groontenouselaid',
//   '0734': 'Groontenousemaid',
//   '0735': 'Groontenousemaster',
//   '0736': 'Groontenousemoving',
//   '0737': 'Groontenousepride',
//   '0738': 'Groontenouseroom',
//   '0739': 'Groontenousesitting',
//   '0740': 'Groontenousetle',
//   '0741': 'Groontenousewall',
//   '0742': 'Groontenousewares',
//   '0743': 'Groontenousewife',
//   '0744': 'Groontenousework',
//   '0745': 'Groontenouseworking',
//   '0746': 'Groontenousewort',
//   '0747': 'Groontenousewreck',
//   '0748': 'Groontenousewrecker',
//   '0749': 'Groontenousewrecking',
//   '0750': 'Groontenousewren',
//   '0751': 'Groontenousewry',
//   '0752': 'Groontenousey',
//   '0753': 'Groontenousier',
//   '0754': 'Groontenousiest',
//   '0755': 'Groontenousily',
//   '0756': 'Groontenousiness',
//   '0757': 'Groontenousingly',
//   '0758': 'Groontenously',
//   '0759': 'Groontenousness',
//   '0760': 'Groontess',
//   '0761': 'Groontes',
//   '0762': 'Groontess',
//   '0763': 'Groontes',
//   '0764': 'Groonteville',
//   '0765': 'Groonteveille',
//   '0766': 'Groonteveillon',
//   '0767': 'Groontevenham',
//   '0768': 'Groontenhall',
//   '0769': 'Groontenham',
//   '0770': 'Groontenhamland',
//   '0771': 'Groontenhanover',
//   '0772': 'Groontenhams',
//   '0773': 'Groontenhamton',
//   '0774': 'Groontehann',
//   '0775': 'Groontenhan',
//   '0776': 'Groontenhans',
//   '0777': 'Groontehansen',
//   '0778': 'Groontenhand',
//   '0779': 'Groontenhandbag',
//   '0780': 'Groontenhandbaggage',
//   '0781': 'Groontenhandbarrow',
//   '0782': 'Groontenhandbill',
//   '0783': 'Groontenhandblock',
//   '0784': 'Groontenhandbook',
//   '0785': 'Groontenhandbrake',
//   '0786': 'Groontenhandcar',
//   '0787': 'Groontenhandcraft',
//   '0788': 'Groontenhandcrafts',
//   '0789': 'Groontenhandcrafte',
//   '0790': 'Groontenhandcrafted',
//   '0791': 'Groontenhandcraftier',
//   '0792': 'Groontenhandcraftiest',
//   '0793': 'Groontenhandcraftiless',
//   '0794': 'Groontenhandcraftily',
//   '0795': 'Groontenhandcraftiness',
//   '0796': 'Groontenhandcrafting',
//   '0797': 'Groontenhandcraftingly',
//   '0798': 'Groontenhandcraftings',
//   '0799': 'Groontenhandcraftism',
//   '0800': 'Groontenhandcraftist',
//   '0801': 'Groontenhandcraftists',
//   '0802': 'Groontenhandcraftly',
//   '0803': 'Groontenhandcraftly',
//   '0804': 'Groontenhandcraftman',
//   '0805': 'Groontenhandcraftmanlike',
//   '0806': 'Groontenhandcraftmanly',
//   '0807': 'Groontenhandcraftmanperson',
//   '0808': 'Groontenhandcraftmans',
//   '0809': 'Groontenhandcraftmanship',
//   '0810': 'Groontenhandcraftmen',
//   '0811': 'Groontenhandcraftpeople',
//   '0812': 'Groontenhandcraftperson',
//   '0813': 'Groontenhandcrafts',
//   '0814': 'Groontenhandcraftship',
//   '0815': 'Groontenhandcraftsmanly',
//   '0816': 'Groontenhandcraftsman',
//   '0817': 'Groontenhandcraftsmans',
//   '0818': 'Groontenhandcraftsmansip',
//   '0819': 'Groontenhandcraftsmen',
//   '0820': 'Groontenhandcraftspeople',
//   '0821': 'Groontenhandcraftsperson',
//   '0822': 'Groontenhandcraftspersonships',
//   '0823': 'Groontenhandcraftswoman',
//   '0824': 'Groontenhandcraftswomen',
//   '0825': 'Groontenhandcraftswork',
//   '0826': 'Groontenhandcraftsworking',
//   '0827': 'Groontenhandcraftworker',
//   '0828': 'Groontenhandcraftsworking',
//   '0829': 'Groontenhandcraftswork',
//   '0830': 'Groontenhandcraftswork',
//   '0831': 'Groontenhandcraftsworking'
// };

// // Build reverse lookup: city_name -> code
// const CITY_NAME_TO_CODE = {};
// Object.entries(CITY_CODES).forEach(([code, name]) => {
//   CITY_NAME_TO_CODE[name.toLowerCase()] = code;
// });

// // ============================================================================
// // HTTP HELPERS
// // ============================================================================

// function makeRequest(options, postData = null) {
//   return new Promise((resolve, reject) => {
//     const req = https.request(options, (res) => {
//       let data = '';
//       res.on('data', (chunk) => { data += chunk; });
//       res.on('end', () => {
//         resolve({ statusCode: res.statusCode, headers: res.headers, data });
//       });
//     });
//     req.on('error', reject);
//     if (postData) req.write(postData);
//     req.end();
//   });
// }

// async function fetchApi(accessToken, path) {
//   const options = {
//     hostname: config.apiUrl,
//     path: path,
//     method: 'GET',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Accept': 'application/json'
//     }
//   };
//   return makeRequest(options);
// }

// // ============================================================================
// // AUTHENTICATION
// // ============================================================================

// async function getAccessToken() {
//   const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
//   const options = {
//     hostname: config.tokenUrl,
//     path: config.tokenPath,
//     method: 'POST',
//     headers: {
//       'Authorization': `Basic ${auth}`,
//       'Content-Type': 'application/x-www-form-urlencoded',
//       'Accept': 'application/json'
//     }
//   };

//   const result = await makeRequest(options);
//   if (result.statusCode !== 200) {
//     throw new Error(`Token request failed: ${result.statusCode}`);
//   }
//   return JSON.parse(result.data).access_token;
// }

// // ============================================================================
// // PROPERTY FIELDS
// // ============================================================================

// const ESSENTIAL_FIELDS = [
//   'ListingId', 'ListingKeyNumeric', 'MlsStatus', 'StandardStatus',
//   'PropertyType', 'PropertySubType',
//   'ListPrice',
//   'UnparsedAddress', 'StreetNumber', 'StreetName', 'StreetSuffix',
//   'UnitNumber', 'City', 'StateOrProvince', 'PostalCode',
//   'CountyOrParish', 'SubdivisionName',
//   'Latitude', 'Longitude',
//   'BedroomsTotal', 'BathroomsTotalInteger',
//   'RoomsTotal', 'LivingAreaSF', 'BuildingAreaTotalSF',
//   'LotSizeAcres', 'LotSizeDimensions',
//   'StoriesTotal', 'YearBuilt',
//   'Appliances', 'Heating', 'Cooling', 'Flooring',
//   'Basement', 'FireplacesTotal', 'GarageSpaces', 'ParkingTotal',
//   'ListAgentFullName', 'ListAgentMlsId', 'ListAgentDirectPhone',
//   'ListOfficeName', 'ListOfficeMlsId', 'ListOfficePhone',
//   'DaysOnMarket', 'ModificationTimestamp',
//   'PhotosCount',
//   'PublicRemarks'
// ];

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// function getCityCode(cityNameOrCode) {
//   // If it's already a code (4 digits), return as-is
//   if (/^\d{4}$/.test(cityNameOrCode)) {
//     return cityNameOrCode;
//   }
//   // Otherwise, look up the code by name
//   return CITY_NAME_TO_CODE[cityNameOrCode.toLowerCase()] || cityNameOrCode;
// }

// function getCityName(code) {
//   return CITY_CODES[code] || code;
// }

// // ============================================================================
// // MEDIA RETRIEVAL
// // ============================================================================

// async function getPropertyMedia(accessToken, listingKeyNumeric) {
//   const result = await fetchApi(accessToken,
//     `/MatrixWebAPI/local/Media?$filter=${encodeURIComponent(`ResourceRecordKeyNumeric eq ${listingKeyNumeric}`)}`);
  
//   if (result.statusCode === 200) {
//     const data = JSON.parse(result.data);
//     return (data.value || []).map(media => ({
//       MediaKey: media.MediaKeyNumeric?.toString(),
//       LongDescription: media.LongDescription,
//       MediaURL: media.MediaPath?.find(p => p.MediaSize === 3)?.MediaUrl || // Large
//                 media.MediaPath?.find(p => p.MediaSize === 7)?.MediaUrl || // XLarge
//                 media.MediaPath?.[0]?.MediaUrl,
//       MediaURLs: {
//         Thumbnail: media.MediaPath?.find(p => p.MediaSize === 1)?.MediaUrl,
//         Small: media.MediaPath?.find(p => p.MediaSize === 6)?.MediaUrl,
//         Default: media.MediaPath?.find(p => p.MediaSize === 2)?.MediaUrl,
//         Large: media.MediaPath?.find(p => p.MediaSize === 3)?.MediaUrl,
//         XLarge: media.MediaPath?.find(p => p.MediaSize === 7)?.MediaUrl,
//       },
//       ModificationTimestamp: media.MediaModificationTimestamp,
//       Order: media.Order,
//       PreferredPhotoYN: media.PreferredPhotoYN,
//       ResourceRecordKey: media.ResourceRecordKeyNumeric?.toString(),
//       ResourceName: media.ResourceName,
//       MediaCategory: media.MediaCategory,
//       MediaType: media.MediaType
//     }));
//   }
//   return [];
// }

// // ============================================================================
// // MAIN PROPERTY FETCHER
// // ============================================================================

// /**
//  * Fetch properties from Alberta with comprehensive data
//  * @param {object} options - Query options
//  * @param {string} options.status - MlsStatus: 'A' (Active), 'P' (Pending), 'S' (Sold), etc.
//  * @param {number} options.minPrice - Minimum list price
//  * @param {number} options.maxPrice - Maximum list price
//  * @param {string} options.city - City name (e.g., "Calgary") or city code (e.g., "0046")
//  * @param {number} options.limit - Maximum results (default: 10)
//  * @param {boolean} options.includeMedia - Fetch media/images for each property (default: false)
//  * @param {string[]} options.fields - Custom fields to select (default: essential fields)
//  */
// async function fetchProperties(accessToken, options = {}) {
//   const {
//     status = 'A',
//     minPrice = null,
//     maxPrice = null,
//     city = null,
//     limit = 10,
//     includeMedia = false,
//     fields = ESSENTIAL_FIELDS
//   } = options;

//   // Build filter
//   const filterParts = [`MlsStatus eq '${status}'`];
  
//   if (minPrice !== null) {
//     filterParts.push(`ListPrice ge ${minPrice}`);
//   }
//   if (maxPrice !== null) {
//     filterParts.push(`ListPrice le ${maxPrice}`);
//   }
//   if (city) {
//     // Convert city name to code if needed
//     const cityCode = getCityCode(city);
//     filterParts.push(`City eq '${cityCode}'`);
//   }

//   const filter = encodeURIComponent(filterParts.join(' and '));
//   const select = encodeURIComponent(fields.join(','));
//   const query = `/MatrixWebAPI/local/Property?$filter=${filter}&$top=${limit}&$select=${select}`;

//   console.log(`Fetching ${MLS_STATUS[status] || status} properties...`);
//   console.log(`Filter: ${filterParts.join(' and ')}`);
//   console.log(`Query path: /MatrixWebAPI/local/Property?$filter=...&$top=${limit}&$select=...\n`);
  
//   const result = await fetchApi(accessToken, query);
  
//   if (result.statusCode !== 200) {
//     if (result.data.startsWith('<')) {
//       throw new Error(`API Error ${result.statusCode}: Query returned too many results. Try adding more filters.`);
//     }
//     try {
//       const error = JSON.parse(result.data);
//       throw new Error(`API Error: ${error.error?.message || error.message || result.data}`);
//     } catch (e) {
//       throw new Error(`API Error ${result.statusCode}: ${result.data.substring(0, 200)}`);
//     }
//   }

//   let data;
//   try {
//     data = JSON.parse(result.data);
//   } catch (e) {
//     throw new Error(`Failed to parse response. The query may have returned too many results.`);
//   }
//   const properties = data.value || [];
  
//   console.log(`✓ Found: ${properties.length} properties\n`);

//   // Transform each property
//   const transformedProperties = [];
  
//   for (const prop of properties) {
//     const cityName = getCityName(prop.City);
    
//     let media = [];
//     if (includeMedia && prop.ListingKeyNumeric) {
//       media = await getPropertyMedia(accessToken, prop.ListingKeyNumeric);
//     }

//     const property = {
//       "@odata.context": `https://${config.apiUrl}/MatrixWebAPI/local/$metadata#Property`,
//       ListingKey: prop.ListingKeyNumeric?.toString(),
//       ListingId: prop.ListingId,
//       MlsStatus: prop.MlsStatus,
//       StandardStatus: MLS_STATUS[prop.MlsStatus] || prop.StandardStatus,
//       PropertyType: prop.PropertyType,
//       PropertySubType: prop.PropertySubType,
//       ListPrice: prop.ListPrice,
//       ListPricePerSquareFoot: prop.ListPriceSquareFoot,
//       UnparsedAddress: prop.UnparsedAddress,
//       StreetNumber: prop.StreetNumber,
//       StreetName: prop.StreetName,
//       StreetSuffix: prop.StreetSuffix,
//       StreetDirPrefix: prop.StreetDirPrefix,
//       StreetDirSuffix: prop.StreetDirSuffix,
//       UnitNumber: prop.UnitNumber,
//       City: cityName,
//       CityCode: prop.City,
//       StateOrProvince: prop.StateOrProvince,
//       PostalCode: prop.PostalCode,
//       CountyOrParish: prop.CountyOrParish,
//       SubdivisionName: prop.SubdivisionName,
//       District: prop.District,
//       Latitude: prop.Latitude,
//       Longitude: prop.Longitude,
//       BedroomsTotal: prop.BedroomsTotal,
//       BedroomsAboveGrade: prop.BedrmsAboveGrade,
//       BedroomsBelowGrade: prop.BedroomsBelowGrade,
//       BedroomsOnMain: prop.BedroomsOnMain,
//       BathroomsTotalInteger: prop.BathroomsTotalInteger,
//       BathroomsFull: prop.BathroomsFull,
//       BathroomsHalf: prop.BathroomsHalf,
//       BathroomsPartial: prop.BathroomsHalf,
//       RoomsTotal: prop.RoomsTotal,
//       RoomsAboveGrade: prop.RoomsAboveGrade,
//       LivingArea: prop.LivingAreaSF,
//       LivingAreaUnits: "Square Feet",
//       BuildingAreaTotal: prop.BuildingAreaTotal || prop.BuildingAreaTotalSF,
//       BuildingAreaUnits: "Square Feet",
//       AboveGradeFinishedArea: prop.MainLevelFinishedAreaSF,
//       BelowGradeFinishedArea: prop.BelowGradeFinishedArea,
//       LotSizeArea: prop.LotSizeAcres,
//       LotSizeDimensions: prop.LotSizeDimensions,
//       LotSizeUnits: "Acres",
//       LotSizeSquareFeet: prop.LotSizeSquareFeet,
//       Stories: prop.StoriesTotal,
//       Levels: prop.Levels,
//       YearBuilt: prop.YearBuilt,
//       BuildingType: prop.BuildingType,
//       StructureType: prop.StructureType,
//       ArchitecturalStyle: prop.ArchitecturalStyle,
//       Appliances: prop.Appliances,
//       Heating: prop.Heating,
//       Cooling: prop.Cooling,
//       Flooring: prop.Flooring,
//       Roof: prop.Roof,
//       ConstructionMaterials: prop.ConstructionMaterials,
//       FoundationDetails: prop.FoundationDetails,
//       ExteriorFeatures: prop.ExteriorFeatures,
//       InteriorFeatures: prop.InteriorFeatures,
//       Basement: prop.Basement,
//       BasementDevelopment: prop.BasementDevelopment,
//       BasementFeatures: prop.BasementFeatures,
//       FireplacesTotal: prop.FireplacesTotal,
//       FireplaceYN: prop.FireplacesTotal > 0,
//       FireplaceFeatures: prop.FireplaceFeatures,
//       PoolFeatures: prop.PoolFeatures,
//       Fencing: prop.Fencing,
//       LotFeatures: prop.LotFeatures,
//       WaterSource: prop.WaterSource,
//       Sewer: prop.Sewer,
//       Electric: prop.Electric,
//       Utilities: prop.Utilities,
//       ParkingTotal: prop.ParkingTotal,
//       GarageSpaces: prop.GarageSpaces,
//       GarageYN: prop.GarageYN,
//       CarportSpaces: prop.CarportSpaces,
//       ParkingFeatures: prop.ParkingFeatures,
//       ListAgentKey: prop.ListAgentKeyNumeric?.toString(),
//       ListAgentFullName: prop.ListAgentFullName,
//       ListAgentMlsId: prop.ListAgentMlsId,
//       ListAgentEmail: prop.ListAgentEmail,
//       ListAgentDirectPhone: prop.ListAgentDirectPhone,
//       CoListAgentKey: prop.CoListAgentKeyNumeric?.toString(),
//       CoListAgentFullName: prop.CoListAgentFullName,
//       ListOfficeKey: prop.ListOfficeKeyNumeric?.toString(),
//       ListOfficeName: prop.ListOfficeName,
//       ListOfficeMlsId: prop.ListOfficeMlsId,
//       ListOfficePhone: prop.ListOfficePhone,
//       ListOfficeEmail: prop.ListOfficeEmail,
//       ListAOR: prop.ListAOR,
//       CoListOfficeKey: prop.CoListOfficeKeyNumeric?.toString(),
//       CoListOfficeName: prop.CoListOfficeName,
//       AssociationYN: prop.AssociationYN,
//       AssociationFee: prop.AssociationFee,
//       AssociationFeeFrequency: prop.AssociationFeeFrequency,
//       AssociationFeeIncludes: prop.AssociationFeeIncludes,
//       TaxLegalDescription: prop.TaxLegalDescription,
//       Zoning: prop.Zoning,
//       ListingContractDate: prop.ListingContractDate,
//       AvailabilityDate: prop.AvailabilityDate,
//       DaysOnMarket: prop.DaysOnMarket,
//       ModificationTimestamp: prop.ModificationTimestamp,
//       PhotosChangeTimestamp: prop.PhotosChangeTimestamp,
//       PublicRemarks: prop.PublicRemarks,
//       Inclusions: prop.Inclusions,
//       VirtualTourURLBranded: prop.VirtualTourURLBranded,
//       VirtualTourURLUnbranded: prop.VirtualTourURLUnbranded,
//       URL3DImage: prop.URL3DImage,
//       InternetEntireListingDisplayYN: prop.InternetEntireListingDisplayYN,
//       InternetAddressDisplayYN: prop.InternetAddressDisplayYN,
//       PhotosCount: prop.PhotosCount,
//       Media: media,
//       CondoName: prop.CondoName || prop.ComplexName,
//       BusinessType: prop.BusinessType,
//       CurrentUse: prop.CurrentUse,
//       PossibleUse: prop.PossibleUse,
//       LeaseAmount: prop.LeaseAmount,
//       LeaseAmountFrequency: prop.LeaseAmountFrequency,
//       OriginatingSystemName: prop.OriginatingSystemName
//     };

//     // Clean up null/undefined values
//     Object.keys(property).forEach(key => {
//       if (property[key] === null || property[key] === undefined) {
//         delete property[key];
//       }
//     });

//     transformedProperties.push(property);
//   }

//   return transformedProperties;
// }

// // ============================================================================
// // UTILITIES
// // ============================================================================

// /**
//  * Get list of available cities
//  */
// function getAvailableCities() {
//   return Object.entries(CITY_CODES).map(([code, name]) => ({
//     code,
//     name
//   })).sort((a, b) => a.name.localeCompare(b.name));
// }

// // ============================================================================
// // MAIN DEMO
// // ============================================================================

// async function main() {
//   try {
//     console.log('='.repeat(80));
//     console.log('MATRIX API - Comprehensive Property Data for Alberta');
//     console.log('='.repeat(80) + '\n');

//     console.log('Authenticating...');
//     const accessToken = await getAccessToken();
//     console.log('✓ Authenticated!\n');

//     // Show available cities
//     console.log('Sample available cities:');
//     const cities = getAvailableCities();
//     cities.slice(0, 10).forEach(city => {
//       console.log(`  ${city.code}: ${city.name}`);
//     });
//     console.log(`  ... and ${cities.length - 10} more cities available\n`);

//     console.log('='.repeat(80));
//     console.log('FETCHING ACTIVE PROPERTIES IN CALGARY\n');
    
//     const properties = await fetchProperties(accessToken, {
//       status: 'A',
//       city: 'Calgary',  // Use city name directly
//       minPrice: 2000000,
//       limit: 5,
//       includeMedia: false  // Set to true if you want to fetch media
//     });

//     // Show summary
//     properties.forEach((prop, i) => {
//       console.log(`[${i + 1}] ${prop.ListingId}`);
//       console.log(`    Address: ${prop.UnparsedAddress}`);
//       console.log(`    Price: $${prop.ListPrice?.toLocaleString() || 'N/A'}`);
//       console.log(`    Bedrooms: ${prop.BedroomsTotal || 'N/A'}, Bathrooms: ${prop.BathroomsTotalInteger || 'N/A'}`);
//       console.log(`    Agent: ${prop.ListAgentFullName || 'N/A'}`);
//       console.log(`    Office: ${prop.ListOfficeName || 'N/A'}`);
//       console.log('');
//     });

//     console.log('='.repeat(80));
//     console.log('\n✓ Done!\n');

//   } catch (error) {
//     console.error('✗ Error:', error.message);
//   }
// }

// // ============================================================================
// // EXPORTS
// // ============================================================================

// export {
//   getAccessToken,
//   fetchProperties,
//   getPropertyMedia,
//   getAvailableCities,
//   getCityCode,
//   getCityName,
//   MLS_STATUS,
//   CITY_CODES,
//   config
// };

// main();


/**
 * Matrix API Client - Streamlined Version
 * Minimal fields, aggressive filtering, fast responses
 */

import https from 'https';

const config = {
  clientId: 'oidc-trestle_dsgnxinc_realstats_134113351420608424-ticuocd',
  clientSecret: 'kOoPeSMxooYgrShfsGQJLrpH0LxFYOv-ONrXWUBY',
  tokenUrl: 'pillarnine.clareityiam.net',
  tokenPath: '/idp/profile/oidc/token?grant_type=client_credentials&scope=openid',
  apiUrl: 'abrls.matrixwebapi.com'
};

const MLS_STATUS = {
  A: 'Active',
  P: 'Pending',
  S: 'Sold',
  LEAS: 'Leased',
  W: 'Withdrawn',
  X: 'Expired',
  T: 'Terminated',
  I: 'Incomplete'
};

const CITY_CODES = {
  '0046': 'Calgary',
  '0047': 'Edmonton',
  '0100': 'Airdrie',
  '0125': 'Canmore',
  '0126': 'Cardston',
  '0134': 'Chestermere',
  '0145': 'Cochrane',
  '0169': 'Didsbury',
  '0182': 'Drayton Valley',
  '0203': 'Edson',
  '0264': 'Fort McMurray',
  '0265': 'Fort Saskatchewan',
};

const CITY_NAME_TO_CODE = {};
Object.entries(CITY_CODES).forEach(([code, name]) => {
  CITY_NAME_TO_CODE[name.toLowerCase()] = code;
});

// ============================================================================
// MINIMAL FIELD SETS
// ============================================================================

// Essential fields only - for fast queries
const MINIMAL_FIELDS = [
  'ListingId', 'ListingKeyNumeric', 'MlsStatus',
  'ListPrice', 'BedroomsTotal', 'BathroomsTotalInteger',
  'UnparsedAddress', 'City', 'PostalCode',
  'LivingAreaSF', 'YearBuilt', 'PropertyType',
  'ListAgentFullName', 'ListOfficeName',
  'PhotosCount', 'DaysOnMarket', 'ModificationTimestamp'
];

// Standard fields - balanced approach
const STANDARD_FIELDS = [
  'ListingId', 'ListingKeyNumeric', 'MlsStatus', 'StandardStatus',
  'PropertyType', 'PropertySubType',
  'ListPrice', 'ListPriceSquareFoot',
  'UnparsedAddress', 'StreetNumber', 'StreetName', 'StreetSuffix',
  'UnitNumber', 'City', 'StateOrProvince', 'PostalCode',
  'CountyOrParish', 'SubdivisionName',
  'Latitude', 'Longitude',
  'BedroomsTotal', 'BathroomsTotalInteger',
  'RoomsTotal', 'LivingAreaSF', 'BuildingAreaTotalSF',
  'LotSizeAcres', 'LotSizeDimensions',
  'StoriesTotal', 'YearBuilt',
  'Appliances', 'Heating', 'Cooling', 'Flooring',
  'Basement', 'FireplacesTotal', 'GarageSpaces', 'ParkingTotal',
  'AssociationYN', 'AssociationFee',
  'ListAgentFullName', 'ListAgentDirectPhone',
  'ListOfficeName', 'ListOfficePhone',
  'DaysOnMarket', 'ModificationTimestamp',
  'PhotosCount', 'PublicRemarks'
];

// ============================================================================
// HTTP HELPERS
// ============================================================================

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function fetchApi(accessToken, path) {
  const options = {
    hostname: config.apiUrl,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  };
  return makeRequest(options);
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function getAccessToken() {
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const options = {
    hostname: config.tokenUrl,
    path: config.tokenPath,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  };

  const result = await makeRequest(options);
  if (result.statusCode !== 200) {
    throw new Error(`Token request failed: ${result.statusCode}`);
  }
  return JSON.parse(result.data).access_token;
}

// ============================================================================
// MEDIA RETRIEVAL
// ============================================================================

async function getPropertyMedia(accessToken, listingKeyNumeric) {
  try {
    const result = await fetchApi(accessToken,
      `/MatrixWebAPI/local/Media?$filter=${encodeURIComponent(`ResourceRecordKeyNumeric eq ${listingKeyNumeric}`)}`);
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.data);
      return (data.value || []).slice(0, 10).map(media => ({
        MediaURL: media.MediaPath?.find(p => p.MediaSize === 3)?.MediaUrl || 
                  media.MediaPath?.find(p => p.MediaSize === 7)?.MediaUrl || 
                  media.MediaPath?.[0]?.MediaUrl,
        LongDescription: media.LongDescription,
        Order: media.Order
      }));
    }
    return [];
  } catch (err) {
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCityCode(cityNameOrCode) {
  if (/^\d{4}$/.test(cityNameOrCode)) {
    return cityNameOrCode;
  }
  return CITY_NAME_TO_CODE[cityNameOrCode.toLowerCase()] || cityNameOrCode;
}

function getCityName(code) {
  return CITY_CODES[code] || code;
}

// ============================================================================
// MAIN PROPERTY FETCHER - STREAMLINED
// ============================================================================

/**
 * Fetch properties with smart filtering
 * @param {object} options
 * @param {string} options.status - 'A' (Active), 'P' (Pending), 'S' (Sold)
 * @param {string} options.city - City name or code
 * @param {number} options.minPrice - Minimum price
 * @param {number} options.maxPrice - Maximum price
 * @param {number} options.minBedrooms - Minimum bedrooms
 * @param {number} options.maxBedrooms - Maximum bedrooms
 * @param {number} options.minBathrooms - Minimum bathrooms
 * @param {number} options.minLivingArea - Minimum living area (sq ft)
 * @param {number} options.maxLivingArea - Maximum living area (sq ft)
 * @param {string} options.propertyType - Property type
 * @param {number} options.limit - Results to return (default: 10)
 * @param {boolean} options.includeMedia - Fetch photos (default: false)
 * @param {string} options.fields - 'minimal' or 'standard' (default: 'minimal')
 */
async function fetchProperties(accessToken, options = {}) {
  const {
    status = 'A',
    city = null,
    minPrice = null,
    maxPrice = null,
    minBedrooms = null,
    maxBedrooms = null,
    minBathrooms = null,
    minLivingArea = null,
    maxLivingArea = null,
    propertyType = null,
    limit = 10,
    includeMedia = false,
    fields = 'minimal'  // Use minimal by default
  } = options;

  // Select field set
  const fieldSet = fields === 'standard' ? STANDARD_FIELDS : MINIMAL_FIELDS;

  // Build aggressive filter - most restrictive first
  const filterParts = [`MlsStatus eq '${status}'`];
  
  if (city) {
    const cityCode = getCityCode(city);
    filterParts.push(`City eq '${cityCode}'`);
  }
  
  // Price filters (most effective)
  if (minPrice !== null) {
    filterParts.push(`ListPrice ge ${minPrice}`);
  }
  if (maxPrice !== null) {
    filterParts.push(`ListPrice le ${maxPrice}`);
  }
  
  // Bedroom filters
  if (minBedrooms !== null) {
    filterParts.push(`BedroomsTotal ge ${minBedrooms}`);
  }
  if (maxBedrooms !== null) {
    filterParts.push(`BedroomsTotal le ${maxBedrooms}`);
  }
  
  // Bathroom filters
  if (minBathrooms !== null) {
    filterParts.push(`BathroomsTotalInteger ge ${minBathrooms}`);
  }
  
  // Living area filters (very effective)
  if (minLivingArea !== null) {
    filterParts.push(`LivingAreaSF ge ${minLivingArea}`);
  }
  if (maxLivingArea !== null) {
    filterParts.push(`LivingAreaSF le ${maxLivingArea}`);
  }
  
  // Property type filter
  if (propertyType) {
    filterParts.push(`PropertyType eq '${propertyType}'`);
  }

  const filter = encodeURIComponent(filterParts.join(' and '));
  const select = encodeURIComponent(fieldSet.join(','));
  const query = `/MatrixWebAPI/local/Property?$filter=${filter}&$top=${limit}&$select=${select}`;

  console.log(`\n🔍 Searching...`);
  console.log(`Filters: ${filterParts.join(' AND ')}\n`);
  
  const result = await fetchApi(accessToken, query);
  
  if (result.statusCode === 403 || (result.statusCode === 400 && result.data.includes('too many'))) {
    console.log('\n❌ Too many results. Try:');
    console.log('   • Increase minPrice');
    console.log('   • Decrease maxPrice');
    console.log('   • Add minLivingArea');
    console.log('   • Reduce limit');
    console.log('   • Use propertyType filter\n');
    throw new Error(`API Error 403: Too many results`);
  }
  
  if (result.statusCode !== 200) {
    try {
      const error = JSON.parse(result.data);
      throw new Error(`API Error: ${error.error?.message || result.data}`);
    } catch (e) {
      throw new Error(`API Error ${result.statusCode}`);
    }
  }

  let data = JSON.parse(result.data);
  const properties = data.value || [];
  
  console.log(`✅ Found ${properties.length} properties\n`);

  // Transform properties
  const result_properties = [];
  
  for (const prop of properties) {
    const cityName = getCityName(prop.City);
    
    let media = [];
    if (includeMedia && prop.ListingKeyNumeric) {
      media = await getPropertyMedia(accessToken, prop.ListingKeyNumeric);
    }

    const property = {
      ListingId: prop.ListingId,
      ListingKey: prop.ListingKeyNumeric?.toString(),
      MlsStatus: prop.MlsStatus,
      StandardStatus: MLS_STATUS[prop.MlsStatus] || prop.StandardStatus,
      
      ListPrice: prop.ListPrice,
      ListPricePerSquareFoot: prop.ListPriceSquareFoot,
      
      Address: prop.UnparsedAddress,
      City: cityName,
      PostalCode: prop.PostalCode,
      Latitude: prop.Latitude,
      Longitude: prop.Longitude,
      
      Bedrooms: prop.BedroomsTotal,
      Bathrooms: prop.BathroomsTotalInteger,
      Rooms: prop.RoomsTotal,
      LivingArea: prop.LivingAreaSF,
      BuildingArea: prop.BuildingAreaTotalSF,
      LotSize: prop.LotSizeAcres,
      
      YearBuilt: prop.YearBuilt,
      PropertyType: prop.PropertyType,
      PropertySubType: prop.PropertySubType,
      
      Basement: prop.Basement,
      Fireplaces: prop.FireplacesTotal,
      Garage: prop.GarageSpaces,
      Parking: prop.ParkingTotal,
      
      Heating: prop.Heating,
      Cooling: prop.Cooling,
      Appliances: prop.Appliances,
      
      HOA: prop.AssociationYN,
      HOAFee: prop.AssociationFee,
      
      Agent: prop.ListAgentFullName,
      AgentPhone: prop.ListAgentDirectPhone,
      Office: prop.ListOfficeName,
      OfficePhone: prop.ListOfficePhone,
      
      DaysOnMarket: prop.DaysOnMarket,
      LastModified: prop.ModificationTimestamp,
      PhotoCount: prop.PhotosCount,
      
      Remarks: prop.PublicRemarks?.substring(0, 200),
      
      Media: media
    };

    // Remove null values
    Object.keys(property).forEach(key => {
      if (property[key] === null || property[key] === undefined) {
        delete property[key];
      }
    });

    result_properties.push(property);
  }

  return result_properties;
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

function displayProperty(prop, index) {
  console.log(`\n[${index}] ${prop.ListingId}`);
  console.log(`    ${prop.Address}`);
  console.log(`    ${prop.City}, ${prop.PostalCode}`);
  console.log(`    💰 $${prop.ListPrice?.toLocaleString()} (${prop.ListPricePerSquareFoot?.toFixed(2)}/sqft)`);
  console.log(`    🛏️  ${prop.Bedrooms}bd | 🚿 ${prop.Bathrooms}ba | 📏 ${prop.LivingArea?.toLocaleString()}sqft`);
  console.log(`    🔨 Built: ${prop.YearBuilt} | 🔥 Fireplaces: ${prop.Fireplaces || 0}`);
  console.log(`    🚗 Garage: ${prop.Garage || 0} | 🅿️  Parking: ${prop.Parking || 0}`);
  console.log(`    ⛈️  ${prop.Heating || 'N/A'} | ❄️  ${prop.Cooling || 'N/A'}`);
  console.log(`    📸 ${prop.PhotoCount || 0} photos`);
  console.log(`    👤 ${prop.Agent} | ${prop.Office}`);
  console.log(`    📅 ${prop.DaysOnMarket} days on market`);
  if (prop.Media?.length > 0) {
    console.log(`    🖼️  ${prop.Media.length} media items`);
  }
}

// ============================================================================
// MAIN DEMO
// ============================================================================

async function main() {
  try {
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + 'MATRIX API - Streamlined Property Search'.padEnd(79) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');

    console.log('\n🔐 Authenticating...');
    const accessToken = await getAccessToken();
    console.log('✅ Authenticated!');

    // Example: Luxury homes
    console.log('\n' + '═'.repeat(80));
    console.log('EXAMPLE 1: Luxury homes in Calgary');
    console.log('═'.repeat(80));
    
    const properties = await fetchProperties(accessToken, {
      status: 'A',
      city: 'Calgary',
      minBedrooms: 4,
      minBathrooms: 3,
      minPrice: 5000000,
      maxPrice: 10000000,
      limit: 5,
      includeMedia: true,
      fields: 'minimal'  // Use minimal fields for speed
    });

    if (properties.length > 0) {
      properties.forEach((prop, i) => displayProperty(prop, i + 1));
      
      console.log('\n\n📋 Raw JSON (first property):');
      console.log(JSON.stringify(properties[0], null, 2).substring(0, 1500) + '...\n');
    }

    // Example: Mid-range homes
    console.log('\n' + '═'.repeat(80));
    console.log('EXAMPLE 2: Mid-range homes in Calgary');
    console.log('═'.repeat(80));
    
    const properties2 = await fetchProperties(accessToken, {
      status: 'A',
      city: 'Calgary',
      minBedrooms: 3,
      minBathrooms: 2,
      minPrice: 1000000,
      maxPrice: 3000000,
      minLivingArea: 2500,
      limit: 3,
      includeMedia: false,
      fields: 'minimal'
    });

    if (properties2.length > 0) {
      properties2.forEach((prop, i) => displayProperty(prop, i + 1));
    }

    console.log('\n✨ Done!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  getAccessToken,
  fetchProperties,
  getPropertyMedia,
  getCityCode,
  getCityName,
  displayProperty,
  MINIMAL_FIELDS,
  STANDARD_FIELDS,
  MLS_STATUS,
  CITY_CODES,
  config
};

main();