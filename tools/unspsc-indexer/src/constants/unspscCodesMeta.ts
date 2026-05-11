/**
 * Semantic metadata for UNSPSC codes used in vector search.
 * Each code has synonyms and context terms that help the embedding model
 * understand how community members describe this need.
 */

export const CODE_META: Record<number, { synonyms: string[]; context: string }> = {
  // ========== PEER EMOTIONAL SUPPORT (931515) ==========
  93151501: {
    synonyms: ['listening', 'ear', 'talk', 'vent', 'share', 'emotional support'],
    context: 'listening ear someone to talk to emotional support peer support anxiety depression',
  },
  93151502: {
    synonyms: ['grief', 'loss', 'mourning', 'death', 'bereaved'],
    context: 'grief loss mourning death support bereavement',
  },
  93151503: {
    synonyms: ['counseling', 'talking therapy', 'peer counselor', 'mental health'],
    context: 'peer counseling mutual support mental health emotional wellbeing',
  },
  93151504: {
    synonyms: ['support group', 'group support', 'peer group', 'meeting'],
    context: 'support groups peer groups mutual aid circles collective healing',
  },
  93151505: {
    synonyms: ['crisis', 'hotline', 'emergency support', 'help line'],
    context: 'crisis hotline emergency support mental health crisis intervention',
  },

  // ========== PEER CARE SUPPORT (931516) ==========
  93151601: {
    synonyms: ['personal care', 'care assistance', 'help with bathing', 'ADL support'],
    context: 'personal care activities daily living assistance elderly disabled care',
  },
  93151602: {
    synonyms: ['meal prep', 'cooking', 'prepare food', 'cook for me'],
    context: 'meal preparation cooking help food preparation dish cooking',
  },
  93151603: {
    synonyms: ['medication reminder', 'take medicine', 'pill reminder', 'medication help'],
    context: 'medication reminders pill reminder medication management health support',
  },
  93151604: {
    synonyms: ['elder accompaniment', 'help with elder', 'elder care', 'aging support'],
    context: 'elder care aging support elderly companion assistance elder friend',
  },
  93151605: {
    synonyms: ['disability support', 'disabled person', 'accessibility help', 'disabled assistance'],
    context: 'disability support disabled community accessibility peer support disabled',
  },

  // ========== CHILDCARE (931517) ==========
  93151701: {
    synonyms: ['babysitting', 'child care', 'watch kids', 'babysitter', 'childcare'],
    context: 'babysitting childcare swap child care kids child supervision',
  },
  93151702: {
    synonyms: ['tutoring', 'tutor', 'teach', 'homework help', 'academic support'],
    context: 'peer tutoring homework help academic support learning teaching',
  },
  93151703: {
    synonyms: ['after school', 'after school care', 'school pickup'],
    context: 'after school care after school program school pickup supervision',
  },
  93151704: {
    synonyms: ['playdate', 'play date', 'kids play together', 'arrange playdates'],
    context: 'playdate coordination children playing kids social activity',
  },
  93151705: {
    synonyms: ['mentoring', 'mentor', 'youth mentor', 'youth guidance'],
    context: 'youth mentoring mentorship young people guidance support mentor',
  },

  // ========== TRANSPORTATION (931518) ==========
  93151801: {
    synonyms: ['ride', 'car ride', 'lift', 'drive me', 'pick up', 'ride sharing'],
    context: 'ride sharing carpooling rides transportation mutual aid carpools',
  },
  93151802: {
    synonyms: ['carpool', 'shared ride', 'commute share', 'ride together'],
    context: 'carpooling commute shared ride regular rides',
  },
  93151803: {
    synonyms: ['doctor ride', 'medical ride', 'appointment ride', 'doctor transport'],
    context: 'medical appointment rides doctor transport health appointment ride',
  },
  93151804: {
    synonyms: ['accompaniment', 'go with me', 'someone to go with', 'accompany me'],
    context: 'accompaniment go with someone escort support being accompanied',
  },
  93151805: {
    synonyms: ['bike buddy', 'cycling partner', 'bike ride', 'bike support'],
    context: 'bike buddy cycling partner transportation biking',
  },

  // ========== LEGAL NAVIGATION (931519) ==========
  93151901: {
    synonyms: ['court accompany', 'court support', 'court company', 'go to court'],
    context: 'court accompaniment legal support court appearance community witness',
  },
  93151902: {
    synonyms: ['know your rights', 'legal rights', 'rights education', 'legal help'],
    context: 'know your rights legal rights tenant rights worker rights education',
  },
  93151903: {
    synonyms: ['paperwork help', 'form help', 'application help', 'documentation'],
    context: 'paperwork help application forms bureaucracy documentation assistance',
  },
  93151904: {
    synonyms: ['translation', 'interpret', 'translator', 'interpreter'],
    context: 'translation services interpreter language translation multilingual support',
  },
  93151905: {
    synonyms: ['benefits', 'welfare', 'benefits application', 'government benefits'],
    context: 'benefits navigation welfare social security food stamps unemployment',
  },
  93151906: {
    synonyms: ['immigration', 'immigration support', 'immigrant help', 'visa'],
    context: 'immigration support immigrant assistance documentation legal status',
  },

  // ========== HEALTH NAVIGATION (931520) ==========
  93152001: {
    synonyms: ['health navigation', 'healthcare help', 'medical guidance'],
    context: 'health navigation healthcare navigation medical guidance patient advocacy',
  },
  93152002: {
    synonyms: ['appointment booking', 'schedule appointment', 'book doctor'],
    context: 'appointment booking scheduling medical appointment healthcare navigation',
  },
  93152003: {
    synonyms: ['medical advocacy', 'patient advocate', 'health advocate'],
    context: 'medical advocacy patient advocate health advocacy healthcare support',
  },
  93152004: {
    synonyms: ['insurance help', 'insurance question', 'health insurance', 'coverage'],
    context: 'insurance help health insurance coverage insurance navigation medical billing',
  },
  93152005: {
    synonyms: ['prescription pickup', 'get medicine', 'pharmacy pickup', 'prescription'],
    context: 'prescription pickup pharmacy medication medical supply',
  },

  // ========== HOME REPAIR (931521) ==========
  93152101: {
    synonyms: ['home repair', 'fix it', 'repair help', 'handyperson', 'handy'],
    context: 'home repair basic repairs fix it handyperson maintenance carpentry',
  },
  93152102: {
    synonyms: ['tool sharing', 'borrow tools', 'tool library', 'share tools'],
    context: 'tool sharing tool library borrow tools equipment sharing',
  },
  93152103: {
    synonyms: ['repair skills', 'teach repair', 'repair knowledge', 'how to fix'],
    context: 'repair skill sharing teaching repair skills knowledge sharing repair',
  },
  93152104: {
    synonyms: ['cleaning help', 'house cleaning', 'clean house', 'cleaning support'],
    context: 'cleaning help house cleaning cleaning support tidying organizing',
  },
  93152105: {
    synonyms: ['moving', 'help move', 'move assistance', 'moving help'],
    context: 'moving assistance help moving relocation moving support',
  },

  // ========== FOOD SUPPORT (931522) ==========
  93152201: {
    synonyms: ['meal train', 'meal delivery', 'prepared meals', 'food delivery'],
    context: 'meal train meal delivery prepared meals food delivery community meal',
  },
  93152202: {
    synonyms: ['community cooking', 'group cook', 'cook together', 'cooking class'],
    context: 'community cooking group cooking shared cooking cooking class',
  },
  93152203: {
    synonyms: ['grocery shopping', 'shop for groceries', 'shopping help'],
    context: 'grocery shopping shopping assistance food shopping',
  },
  93152204: {
    synonyms: ['food preservation', 'canning', 'preserve food', 'fermentation'],
    context: 'food preservation canning fermentation food storage preserving',
  },
  93152205: {
    synonyms: ['cooking skill', 'cooking class', 'teach cooking', 'cooking workshop'],
    context: 'cooking skill sharing cooking class cooking workshop food skills',
  },

  // ========== SKILLS SHARING (931523) ==========
  93152301: {
    synonyms: ['skill sharing', 'learn skill', 'skill exchange', 'share knowledge'],
    context: 'skill sharing peer learning skills exchange knowledge sharing expertise',
  },
  93152302: {
    synonyms: ['tech help', 'computer help', 'tech support', 'internet help'],
    context: 'tech help technology support computer support internet help digital',
  },
  93152303: {
    synonyms: ['language exchange', 'learn language', 'language swap', 'teach language'],
    context: 'language exchange multilingual learning language teaching translation',
  },
  93152304: {
    synonyms: ['study circles', 'learning group', 'study group', 'class'],
    context: 'study circles learning groups educational classes reading groups',
  },
  93152305: {
    synonyms: ['job search', 'job help', 'resume', 'interview help', 'employment'],
    context: 'job search support employment assistance resume help interview prep',
  },
  93152306: {
    synonyms: ['financial literacy', 'money help', 'budgeting', 'financial education'],
    context: 'financial literacy money management budgeting financial education',
  },

  // ========== SAFETY (931524) ==========
  93152401: {
    synonyms: ['safety escort', 'escort', 'walk with me', 'safe travel'],
    context: 'safety escort community accompaniment safe travel security support',
  },
  93152402: {
    synonyms: ['community watch', 'neighbor watch', 'street watch', 'safety'],
    context: 'community watch neighborhood safety mutual aid security awareness',
  },
  93152403: {
    synonyms: ['emergency contact', 'emergency number', 'call in emergency'],
    context: 'emergency contact emergency support safety network crisis',
  },
  93152404: {
    synonyms: ['pet care', 'pet sitting', 'cat sitting', 'dog sitting', 'pet watch'],
    context: 'pet care pet sitting animal care pet support',
  },

  // ========== HARM REDUCTION (931525) ==========
  93152501: {
    synonyms: ['harm reduction', 'supplies', 'reduction supplies'],
    context: 'harm reduction supplies health supplies safety supplies',
  },
  93152502: {
    synonyms: ['safe use', 'safe consumption', 'using safely'],
    context: 'safe consumption substance use safety harm reduction',
  },
  93152503: {
    synonyms: ['overdose prevention', 'naloxone', 'overdose support', 'overdose risk'],
    context: 'overdose prevention naloxone substance use safety emergency response',
  },
  93152504: {
    synonyms: ['syringe exchange', 'needle exchange', 'clean needles'],
    context: 'syringe exchange needle exchange harm reduction health',
  },
  93152505: {
    synonyms: ['naloxone', 'narcan', 'overdose reversal', 'opioid reversal'],
    context: 'naloxone distribution overdose naloxone narcan emergency',
  },
  93152506: {
    synonyms: ['drug checking', 'substance testing', 'fentanyl testing', 'test drugs'],
    context: 'drug checking substance testing fentanyl test safety',
  },
  93152507: {
    synonyms: ['wound care', 'wound treatment', 'infection prevention', 'bandages'],
    context: 'wound care medical supplies first aid infection prevention',
  },
  93152508: {
    synonyms: ['safer sex', 'condoms', 'sexual health'],
    context: 'safer sex supplies sexual health condoms protection',
  },
  93152509: {
    synonyms: ['fentanyl test strips', 'test strips', 'fentanyl testing'],
    context: 'fentanyl test strips drug testing substance safety',
  },
  93152510: {
    synonyms: ['peer counseling substance', 'substance support', 'recovery support'],
    context: 'peer counseling substance use support recovery addiction',
  },

  // ========== STREET MEDICINE (931526) ==========
  93152601: {
    synonyms: ['street outreach', 'outreach', 'street support', 'unhoused support'],
    context: 'street outreach homelessness housing first support',
  },
  93152602: {
    synonyms: ['first aid', 'basic first aid', 'emergency care', 'minor injuries'],
    context: 'first aid basic first aid emergency medical care wound',
  },
  93152603: {
    synonyms: ['hygiene', 'hygiene access', 'shower', 'bathroom', 'sanitation'],
    context: 'hygiene access sanitation shower facilities cleanliness supplies',
  },
  93152604: {
    synonyms: ['wellness check', 'check in', 'wellness visit', 'health check'],
    context: 'wellness checks health checks community care safety check',
  },
  93152605: {
    synonyms: ['resource', 'resources', 'resource connection', 'service connection'],
    context: 'resource connection service connection assistance social services',
  },

  // ========== CRIMINALIZED COMMUNITIES SUPPORT (931527) ==========
  93152701: {
    synonyms: ['jail support', 'incarceration', 'jail', 'prison support'],
    context: 'jail support incarceration prison support criminal justice',
  },
  93152702: {
    synonyms: ['emergency funds', 'emergency money', 'bail', 'financial emergency'],
    context: 'emergency funds bail money emergency financial assistance',
  },
  93152703: {
    synonyms: ['commissary', 'commissary support', 'jail commissary', 'prison commissary'],
    context: 'commissary support incarcerated people emergency funds',
  },
  93152704: {
    synonyms: ['family connection', 'family visit', 'keep in touch', 'family support'],
    context: 'family connection incarcerated family communication support',
  },
  93152705: {
    synonyms: ['reentry', 'reentry support', 'coming home', 'transition home'],
    context: 'reentry support prisoner reentry coming home transition',
  },

  // ========== REPRODUCTIVE JUSTICE (931528) ==========
  93152801: {
    synonyms: ['abortion access', 'abortion support', 'reproductive care'],
    context: 'abortion access reproductive justice abortion support abortion fund',
  },
  93152802: {
    synonyms: ['pregnancy', 'pregnancy support', 'pregnant', 'birth support'],
    context: 'pregnancy support prenatal postpartum birth reproductive justice',
  },
  93152803: {
    synonyms: ['childcare appointment', 'childcare medical', 'babysitting appointment'],
    context: 'childcare appointment reproductive justice childcare support',
  },
  93152804: {
    synonyms: ['menstrual products', 'period products', 'pads', 'tampons'],
    context: 'menstrual products period products hygiene products periods',
  },
  93152805: {
    synonyms: ['birth', 'birth support', 'doula', 'midwife support', 'birth worker'],
    context: 'birth support doula birth worker pregnancy childbirth',
  },

  // ========== DISABILITY JUSTICE (931529) ==========
  93152901: {
    synonyms: ['mobility aid', 'wheelchair', 'crutches', 'walker', 'mobility sharing'],
    context: 'mobility aid sharing wheelchair accessibility disabled equipment',
  },
  93152902: {
    synonyms: ['accessibility', 'accessible', 'accessibility consulting', 'access'],
    context: 'accessibility consulting disability justice accessible design',
  },
  93152903: {
    synonyms: ['attendant care', 'personal care assistant', 'disability care', 'PCA'],
    context: 'peer attendant care personal care assistant disability support',
  },
  93152904: {
    synonyms: ['disability advocacy', 'advocate', 'disability rights', 'disability support'],
    context: 'disability advocacy disability rights disabled community support',
  },
  93152905: {
    synonyms: ['accessible transport', 'accessible transportation', 'accessible ride'],
    context: 'accessible transport transportation disabled people accessibility',
  },

  // ========== COMMUNITY GATHERING (931530) ==========
  93153001: {
    synonyms: ['potluck', 'community dinner', 'shared meal', 'social meal'],
    context: 'potluck community dinner social meal shared food gathering',
  },
  93153002: {
    synonyms: ['open house', 'welcoming space', 'community space', 'gathering space'],
    context: 'open house welcoming space community gathering space social',
  },
  93153003: {
    synonyms: ['social event', 'game night', 'movie night', 'craft circle', 'gathering'],
    context: 'social event game night movie night craft circle community gathering',
  },
  93153004: {
    synonyms: ['community space', 'shared space', 'gathering place', 'meeting space'],
    context: 'community space gathering place meeting space shared community',
  },
  93153005: {
    synonyms: ['holiday gathering', 'celebration', 'holiday party', 'seasonal'],
    context: 'holiday gathering celebration seasonal community gathering',
  },
  93153006: {
    synonyms: ['community kitchen', 'shared kitchen', 'collective kitchen', 'cooking space'],
    context: 'community kitchen shared kitchen collective kitchen cooking',
  },
  93153007: {
    synonyms: ['celebration', 'ritual space', 'ceremony', 'spiritual gathering'],
    context: 'celebration ritual space ceremony spiritual community gathering',
  },
  93153008: {
    synonyms: ['kids play', 'children play', 'kid social', 'child play group'],
    context: 'kids social play children gathering play group',
  },
  93153009: {
    synonyms: ['community library', 'lending library', 'book sharing', 'little free library'],
    context: 'community library book sharing little library collective lending',
  },
  93153010: {
    synonyms: ['meeting space', 'community meeting', 'assembly space', 'gathering'],
    context: 'community meeting space gathering assembly collective',
  },

  // ========== CONNECTION & ANTI-ISOLATION (931531) ==========
  93153101: {
    synonyms: ['companionship', 'friend', 'companion', 'spending time', 'visit'],
    context: 'companionship friendship social connection isolation fighting',
  },
  93153102: {
    synonyms: ['welcoming', 'welcome new people', 'new neighbor', 'integration'],
    context: 'welcoming new people newcomer integration community building',
  },
  93153103: {
    synonyms: ['check-in', 'checkins', 'regular checkins', 'buddy system', 'wellness check'],
    context: 'regular checkins buddy system wellness support anti-isolation',
  },
  93153104: {
    synonyms: ['group activity', 'activity together', 'activity group'],
    context: 'group activity shared activity community activity social',
  },

  // ========== MATERIAL GOODS ==========
  // Pet products (segment 10)
  50201506: {
    synonyms: ['fresh vegetables', 'produce', 'veggies', 'tomatoes', 'garden surplus'],
    context: 'fresh vegetables produce garden farming food distribution',
  },
  50201507: {
    synonyms: ['fresh fruits', 'apples', 'oranges', 'berries', 'fruit'],
    context: 'fresh fruit produce farming food distribution',
  },
  50201710: {
    synonyms: ['prepared meals', 'cooked food', 'ready to eat meals'],
    context: 'prepared meals food delivery meals ready to eat',
  },
  50201735: {
    synonyms: ['beverages', 'drinks', 'juice', 'water', 'non-alcoholic'],
    context: 'beverages drinks liquids non-alcoholic',
  },
  42192200: {
    synonyms: ['medical supplies', 'mobility aids', 'first aid', 'bandages', 'wheelchair'],
    context: 'medical supplies mobility aid first aid health supplies',
  },
  53100000: {
    synonyms: ['clothing', 'clothes', 'shoes', 'apparel', 'fashion', 'coat', 'shoes'],
    context: 'clothing apparel shoes fashion fashion clothing',
  },
  49000000: {
    synonyms: ['baby products', 'diapers', 'formula', 'baby items', 'infant supplies'],
    context: 'baby products diapers formula infant supplies',
  },
  72101702: {
    synonyms: ['hygiene products', 'shampoo', 'soap', 'toothpaste', 'toilet paper'],
    context: 'hygiene products cleaning supplies personal care sanitation',
  },
};
