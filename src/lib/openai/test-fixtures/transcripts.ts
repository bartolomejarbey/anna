import type { CustomerExtraction } from "@/lib/openai/schemas/customer-extraction";

/**
 * End-to-end test fixtures for the extraction pipeline.
 *
 * Each fixture is a plausible Czech advisor↔customer dialogue (300–500 words)
 * paired with the expected `CustomerExtraction` output. Used in:
 *   - Manual smoke tests during prompt iteration.
 *   - Future automatic eval harness (per-field accuracy ≥ 85 %).
 *
 * Profiles deliberately diverse: single 27yo in IT, married 38yo with kids
 * and mortgage, divorced 45yo single mom, near-retirement 62yo, OSVČ widow.
 *
 * `expected` is a Partial because some fields (`occupation`, `notes`) are
 * inherently fuzzy and are validated by spot-check, not exact match.
 */

type Fixture = {
  id: string;
  label: string;
  transcript: string;
  expected: Partial<CustomerExtraction>;
};

export const fixtures: ReadonlyArray<Fixture> = [
  {
    id: "fixture-01",
    label: "Mladý svobodný IT specialista, cíl byt v Praze",
    transcript: `Poradce: Dobrý den, posaďte se prosím. Já jsem Karel Novák, finanční poradce. Než začneme, povíte mi pár základních věcí o sobě?
Klient: Jasně. Jmenuju se Petr Vondráček, je mi sedmadvacet, jsem svobodný, žádné děti. Bydlím v Praze v podnájmu, platím dvanáct tisíc měsíčně.
Poradce: A kde pracujete?
Klient: Dělám juniora ve vývojářské firmě, asi rok a půl po škole. Beru čtyřicet pět tisíc čistého. Kromě toho občas něco vyfakturuju jako OSVČ, ale to jsou drobné.
Poradce: Co vás teď z financí nejvíc zajímá?
Klient: Hlavně si chci do pěti let pořídit byt, klidně menší. Počítám s nějakou hypotékou kolem pěti milionů. Mám teď na účtu sto šedesát tisíc, jinak žádné investice. Spíš vůbec nevím, jak začít.
Poradce: Jaký máte vztah k riziku?
Klient: Bavily by mě ETF a akcie, dlouhodobě. Krátkodobé výkyvy mě netrápí, jsem mladý, mám čas. Konzervativní spoření v bance mi přijde, že nic neunese.
Poradce: A pojištění?
Klient: Žádné nemám, jen úrazové od zaměstnavatele. Asi by se mi něco hodilo, kdybych onemocněl, ale není to priorita.
Poradce: Rezervu na nečekané výdaje?
Klient: Tak těch sto šedesát tisíc beru jako rezervu, ale nemám to nijak rozdělené. A spořím si měsíčně asi dva tisíce navíc.
Poradce: Dobře, rozumím. Pojďme se podívat, jak by to mohlo vypadat dohromady.`,
    expected: {
      customer: {
        full_name: "Petr Vondráček",
        age: 27,
        marital_status: "single",
        has_children: false,
        children_count: 0,
        occupation: "junior vývojář",
      },
      finances: {
        monthly_income_czk: 45000,
        monthly_expenses_czk: null,
        existing_savings_czk: 160000,
        has_mortgage: false,
        monthly_mortgage_czk: null,
      },
      goals: {
        primary_goal: "Pořízení vlastního bytu v Praze, horizont 5 let",
        target_horizon_years: 5,
        risk_appetite: "high",
      },
    },
  },
  {
    id: "fixture-02",
    label: "Ženatý 38letý projektový manažer, dvě malé děti, hypotéka",
    transcript: `Poradce: Vítejte. Petra Svobodová, finanční poradce. Pojďme začít — můžete mi pár větami popsat svou rodinnou a finanční situaci?
Klient: Jsem Tomáš Procházka, je mi osmatřicet. Manželka Lenka, dvě malé děti — dceři jsou čtyři, synovi šest. Bydlíme ve vlastním bytě, máme hypotéku. Zbývá nám čtyři miliony, splácíme dvacet tři tisíc měsíčně, fixace končí za rok a půl.
Poradce: Co děláte za práci, jaký je rodinný rozpočet?
Klient: Dělám projektového manažera v IT, beru sedmdesát dva tisíc čistého. Lenka teď nepracuje, je doma s mladší. Měsíční výdaje včetně hypotéky tak padesát pět, šedesát tisíc.
Poradce: Co vás z financí nejvíc trápí?
Klient: Hlavně mě trápí, kdyby se mi něco stalo. Jsme rodina jednoho příjmu, hypotéka je obrovská. Před dvěma lety nám zemřel kamarád na rakovinu a od té doby si říkám, že to musíme řešit. Žádné životní pojištění nemáme.
Poradce: A spoření, investice?
Klient: Stavební spoření máme oba, dohromady asi devadesát tisíc. Já si navíc spořím tři tisíce do indexových fondů přes ETF, dělám si to sám. Žádný plán, jen pravidelně.
Poradce: Cíl do budoucna?
Klient: Chtěli bychom za pět let postavit chatu na Slapech. A případně dát děti do soukromé školy.
Poradce: Jaký máte vztah k riziku?
Klient: Vyvážený. Něco do akcií, něco bezpečnějšího. Hlavně chci jistotu, že rodina je zajištěná.`,
    expected: {
      customer: {
        full_name: "Tomáš Procházka",
        age: 38,
        marital_status: "married",
        has_children: true,
        children_count: 2,
        occupation: "projektový manažer v IT",
      },
      finances: {
        monthly_income_czk: 72000,
        monthly_expenses_czk: 60000,
        existing_savings_czk: 90000,
        has_mortgage: true,
        monthly_mortgage_czk: 23000,
      },
      goals: {
        primary_goal: "Zajištění rodiny živitele a stavba chaty během 5 let",
        target_horizon_years: 5,
        risk_appetite: "medium",
      },
    },
  },
  {
    id: "fixture-03",
    label: "Rozvedená 45letá matka samoživitelka, ochrana příjmu",
    transcript: `Poradce: Dobrý den, Tomáš Dvořák. Pojďme si projít vaše finance. Můžete mi povědět, jak to máte teď uspořádané?
Klient: Jsem Magdaléna Dvořáková, je mi pětačtyřicet, rozvedená. Mám jedno dítě, dceři je dvanáct, žije se mnou. Bývalý manžel platí výživné, ale nepravidelně.
Poradce: Co děláte za práci?
Klient: Pracuju jako účetní ve středně velké firmě, beru padesát osm tisíc čistého. Bývalý posílá tak deset tisíc měsíčně, ale opravdu nepravidelně, někdy dva měsíce nic, pak za tři měsíce naráz. Plus přídavky na dítě.
Poradce: Bydlení?
Klient: Mám hypotéku na byt v Brně. Splácím čtrnáct tisíc, zbývá mi splatit dva miliony. To je to, co mě nejvíc tlačí.
Poradce: Co kdyby se vám něco stalo?
Klient: Tak to je přesně, co řeším. Mám nějaké životní pojištění od ČSOB, ale je tam plno věcí, kterým nerozumím — asistence, pojištění zavazadel. Bojím se, že kdybych dlouhodobě onemocněla, byt přijdeme.
Poradce: Úspory? Investice?
Klient: Na účtu mám asi sedmdesát tisíc, plus stavební spoření na šestadvacet. Žádné akcie, žádné fondy. Investování mě upřímně děsí.
Poradce: Cíl?
Klient: Hlavně dceru dostat na vysokou. A doplatit hypotéku, ideálně dřív. A mít klid, že kdybych vypadla z práce, máme rezervu.`,
    expected: {
      customer: {
        full_name: "Magdaléna Dvořáková",
        age: 45,
        marital_status: "divorced",
        has_children: true,
        children_count: 1,
        occupation: "účetní",
      },
      finances: {
        monthly_income_czk: 58000,
        monthly_expenses_czk: null,
        existing_savings_czk: 96000,
        has_mortgage: true,
        monthly_mortgage_czk: 14000,
      },
      goals: {
        primary_goal:
          "Ochrana příjmu, doplacení hypotéky a vysokoškolské vzdělání pro dceru",
        target_horizon_years: null,
        risk_appetite: "low",
      },
    },
  },
  {
    id: "fixture-04",
    label: "Předdůchodce 62 let, ženatý, doplnění příjmu",
    transcript: `Poradce: Dobrý den, Eva Černá. Bavili jsme se po telefonu, dnes pojďme detailněji.
Klient: Jsem Jiří Kratochvíl, je mi dvaašedesát. Ženatý, manželka Hana, dospělé děti, vnoučata. Žiju v rodinném domě v Říčanech, bez hypotéky — splatili jsme to před deseti lety.
Poradce: Práce, příjem?
Klient: Pořád pracuju, jsem stavební technik na zakázku. Beru osmdesát tisíc čistého, ale za rok, dva půjdu do předdůchodu. Manželka už v důchodu, bere zhruba šestnáct tisíc. Dohromady tedy s důchodem necelých sto.
Poradce: A teď?
Klient: Měsíční výdaje máme nízké, kolem třicet pět tisíc. Hodně toho ušetříme. Mám životní pojištění z roku 2008, doplňkové penzijní spoření, kde mám asi šest set tisíc, a investici v Patrii, asi milion v ETF. Teď bych chtěl tu rentu nějak smysluplně rozložit.
Poradce: Cíl, riziko?
Klient: Hlavně si chci v důchodu zachovat životní úroveň a něco nechat dětem a vnoučatům. Riziko — vyvážené, do akcií jsem ochotný část dát, ale ne všechno. Spíš stabilita.
Poradce: Pojištění?
Klient: Životní pojistka mi končí za tři roky, asi to budu řešit, ale nevím, jestli má v mém věku ještě smysl pokračovat.`,
    expected: {
      customer: {
        full_name: "Jiří Kratochvíl",
        age: 62,
        marital_status: "married",
        has_children: true,
        children_count: null,
        occupation: "stavební technik",
      },
      finances: {
        monthly_income_czk: 80000,
        monthly_expenses_czk: 35000,
        existing_savings_czk: null,
        has_mortgage: false,
        monthly_mortgage_czk: null,
      },
      goals: {
        primary_goal:
          "Zachování životní úrovně v důchodu a předání majetku dětem a vnoučatům",
        target_horizon_years: null,
        risk_appetite: "medium",
      },
    },
  },
  {
    id: "fixture-05",
    label: "Vdova OSVČ kadeřnice, malé úspory, plánuje rodinu syna",
    transcript: `Poradce: Vítejte, Martin Procházka. Co vás dnes ke mně přivádí?
Klient: Jsem Dana Vlková, je mi padesát osm let. Manžel mi před třemi lety zemřel. Mám syna, je mu třicet dva, žije v Hradci. Bydlím sama v menším bytě, vlastní, hypotéku jsme splatili dávno.
Poradce: Co děláte?
Klient: Jsem OSVČ kadeřnice, mám malé studio. Mám nepravidelné příjmy — někdy třicet pět, někdy padesát, průměrně tak čtyřicet tisíc měsíčně čistého. Po manželovi mi zůstal vdovský důchod, devět tisíc.
Poradce: Úspory?
Klient: Po manželovi mi zůstaly pojistky, vyplatilo se kolem osm set tisíc. Ležely tři roky na účtu, banka mi tam nabízí spořicí účet s dvěma procenty, ale myslím, že je to málo.
Poradce: Co byste si přála?
Klient: Hlavně, aby ty peníze nebyly úplně sežrané inflací. A za pár let bych chtěla pomoct synovi, plánuje s přítelkyní rodinu, takže by potřebovali na bydlení. A pak něco rezervu na vlastní stáří, zdravotní výdaje. Bojím se akcií, slyšela jsem od kamarádky o krachu, ale asi něčemu jednoduchému bych se nebránila.
Poradce: Aktuální pojištění?
Klient: Nic. Manžel byl pojištěný, mě nikdy nenapadlo se pojistit, ale teď mě to napadá kvůli zdraví.`,
    expected: {
      customer: {
        full_name: "Dana Vlková",
        age: 58,
        marital_status: "widowed",
        has_children: true,
        children_count: 1,
        occupation: "OSVČ kadeřnice",
      },
      finances: {
        monthly_income_czk: 40000,
        monthly_expenses_czk: null,
        existing_savings_czk: 800000,
        has_mortgage: false,
        monthly_mortgage_czk: null,
      },
      goals: {
        primary_goal:
          "Ochrana úspor před inflací, podpora syna při bydlení a vlastní rezerva na stáří",
        target_horizon_years: null,
        risk_appetite: "low",
      },
    },
  },
  {
    id: "fixture-06",
    label: "Vysokopříjmový manažer, ženatý, tři děti, audit existujícího pojištění",
    transcript: `Poradce: Vítejte, Eva Černá. Co vás zajímá?
Klient: Jsem Martin Tichý, je mi sedmačtyřicet. Mám eseróčko ve strojírenství, jsem jednatel. Dvanáct zaměstnanců, obrat skoro padesát milionů ročně. Manželka taky pracuje, vyděláváme dohromady sto čtyřicet tisíc měsíčně, z toho já devadesát dva, ona osmačtyřicet.
Poradce: Rodina?
Klient: Tři děti — sedm, deset, čtrnáct. Manželka chce zpátky do práce za rok. Bydlíme ve vlastním rodinném domě, hypotéku jsme zaplatili.
Poradce: Pojištění a investice?
Klient: Mám životní pojistku tři roky starou, ale kamarádka v oboru mi řekla, že je špatně nastavená — moc asistence, málo trvalých následků. To je první důvod, proč jsem tady.
Poradce: Investice?
Klient: Akcie přes Patrii, asi pět milionů, hlavně technologické. Plus mám firemní pojištění na klíčovou osobu, ale nejsem si jistý, jestli na adekvátní částku.
Poradce: Co je hlavní obava?
Klient: Že kdybych vypadl jako jednatel, firma se zhroutí, a rodina by neměla z čeho žít. Potřebuji komplexní revizi. Riziko — agresivní, do akcií jsem investovaný dlouho, krátkodobé propady mě netrápí.`,
    expected: {
      customer: {
        full_name: "Martin Tichý",
        age: 47,
        marital_status: "married",
        has_children: true,
        children_count: 3,
        occupation: "jednatel s.r.o. ve strojírenství",
      },
      finances: {
        monthly_income_czk: 92000,
        monthly_expenses_czk: null,
        existing_savings_czk: null,
        has_mortgage: false,
        monthly_mortgage_czk: null,
      },
      goals: {
        primary_goal:
          "Komplexní audit pojistné ochrany a doplnění invalidní renty pro jednatele",
        target_horizon_years: null,
        risk_appetite: "high",
      },
    },
  },
];
