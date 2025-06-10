/* 
    Daha rahat Postfix donusumu icin birlestirme olmasi gereken yerlere nokta (concatenation) operatoru ekliyoruz.
*/

function concatOperatoruEkle(regex) {
  let output = "";

  for (let i = 0; i < regex.length; i++) {
    const token = regex[i];
    output += token;

    if (token === "(" || token === "|") {
      continue;
    }

    if (i < regex.length - 1) {
      const sonraki = regex[i + 1];

      if (
        sonraki === "*" ||
        sonraki === "+" ||
        sonraki === "|" ||
        sonraki === ")"
      ) {
        continue;
      }

      output += ".";
    }
  }

  return output;
}

/*
      Postfix donusumunde stack kontrolu icin bir fonksiyon
  */
function bak(stack) {
  return stack.length && stack[stack.length - 1];
}

/*
      Operator onceligini belirlemek icin bir fonksiyon
*/
const operatorOnceligi = {        
  "|": 0,
  ".": 1,
  "*": 2,
  "+": 2,
};

/*
      NFA donusumunu daha rahat yapabilmek icin Postfix donusumu yapan bir fonksiyon. (Shunting-Yard Algoritması)
      NFA donusumunde Thompson Algoritmasını kullanacağımız icin Postfix donusumu bu algoritmayı uygularken cok ise yarıyor.
  */
function postfixDonusumu(regex) {
  let output = "";
  const operatorStack = [];

  for (const token of regex) {
    if (token === "." || token === "|" || token === "*" || token === "+") {
      while (
        operatorStack.length &&
        bak(operatorStack) !== "(" &&
        operatorOnceligi[bak(operatorStack)] >= operatorOnceligi[token]
      ) {
        output += operatorStack.pop();
      }

      operatorStack.push(token);
    } else if (token === "(" || token === ")") {
      if (token === "(") {
        operatorStack.push(token);
      } else {
        while (bak(operatorStack) !== "(") {
          output += operatorStack.pop();
        }
        operatorStack.pop();
      }
    } else {
      output += token;
    }
  }

  while (operatorStack.length) {
    output += operatorStack.pop();
  }

  return output;
}

/*
      Yeni NFA state'i olustur.
  */
function stateOlustur(bitisMi) {
  return {
    bitisMi,
    baglanti: {},
    bosBaglanti: [],
  };
}

/*
      Iki farkli State arasina bos baglanti ekle.
  */
function bosBaglantiEkle(nereden, nereye) {
  nereden.bosBaglanti.push(nereye);
}

/*
    Iki farkli State arasina karakter baglantisi ekle.
  */
function baglantiEkle(nereden, nereye, sembol) {
  nereden.baglanti[sembol] = nereye;
}

/*
    Sadece bos stringi algilayacak bir NFA olustur.
  */
function bosNFA() {
  const baslangic = stateOlustur(false);
  const bitis = stateOlustur(true);
  bosBaglantiEkle(baslangic, bitis);

  return { baslangic, bitis };
}

/* 
     Karakter inputu icin bir NFA olustur.
  */
function sembolNFA(sembol) {
  const baslangic = stateOlustur(false);
  const bitis = stateOlustur(true);
  baglantiEkle(baslangic, bitis, sembol);

  return { baslangic, bitis };
}

/* 
     Iki NFA'i birlestir (concatanetion).
  */
function concatNFA(birinci, ikinci) {
  bosBaglantiEkle(birinci.bitis, ikinci.baslangic);
  birinci.bitis.bitisMi = false;

  return { baslangic: birinci.baslangic, bitis: ikinci.bitis };
}

/* 
     Iki NFA'e Union islemi uygula.
  */
function unionNFA(birinci, ikinci) {
  const baslangic = stateOlustur(false);
  bosBaglantiEkle(baslangic, birinci.baslangic);
  bosBaglantiEkle(baslangic, ikinci.baslangic);

  const bitis = stateOlustur(true);

  bosBaglantiEkle(birinci.bitis, bitis);
  birinci.bitis.bitisMi = false;
  bosBaglantiEkle(ikinci.bitis, bitis);
  ikinci.bitis.bitisMi = false;

  return { baslangic, bitis };
}

/* 
     NFA'e yildiz islemini uygula (Kleene's Star)(sıfır ya da daha fazla).
  */
function yildizNFA(nfa) {
  const baslangic = stateOlustur(false);
  const bitis = stateOlustur(true);

  bosBaglantiEkle(baslangic, bitis);
  bosBaglantiEkle(baslangic, nfa.baslangic);

  bosBaglantiEkle(nfa.bitis, bitis);
  bosBaglantiEkle(nfa.bitis, nfa.baslangic);
  nfa.bitis.bitisMi = false;

  return { baslangic, bitis };
}

/*
      Arti islemini bir NFA'e uygula (Bir ya da daha fazla).
  */

function artiNFA(nfa) {
  const baslangic = stateOlustur(false);
  const bitis = stateOlustur(true);

  bosBaglantiEkle(baslangic, nfa.baslangic);
  bosBaglantiEkle(nfa.bitis, bitis);
  bosBaglantiEkle(nfa.bitis, nfa.baslangic);
  nfa.bitis.bitisMi = false;

  return { baslangic, bitis };
}

/*
    Postfix donusumu yapilmis Regular Expression'ı, Thompson Algoritmasini kullanarak NFA'e donusturen fonksiyon.
  */
function NFADonusumu(postfixRegex) {
  if (postfixRegex === "") {
    return bosNFA();
  }

  const stack = [];

  for (const token of postfixRegex) {
    if (token === "*") {
      stack.push(yildizNFA(stack.pop()));
    } else if (token === "+") {
      stack.push(artiNFA(stack.pop()));
    } else if (token === "|") {
      const right = stack.pop();
      const left = stack.pop();
      stack.push(unionNFA(left, right));
    } else if (token === ".") {
      const right = stack.pop();
      const left = stack.pop();
      stack.push(concatNFA(left, right));
    } else {
      stack.push(sembolNFA(token));
    }
  }

  return stack.pop();
}

/*
      Metinde arama islemi icin yardimci fonksiyon
  */
function sonrakiDurumuEkle(state, sonrakiDurumlar, gidilmis) {
  if (state.bosBaglanti.length) {
    for (const st of state.bosBaglanti) {
      if (!gidilmis.find((vs) => vs === st)) {
        gidilmis.push(st);
        sonrakiDurumuEkle(st, sonrakiDurumlar, gidilmis);
      }
    }
  } else {
    sonrakiDurumlar.push(state);
  }
}

/*
      Girilen bir stringi, olusturulmus olan NFA'e gore pattern icerip icermedigini kontrol eden fonksiyon.
  */
function ara(nfa, kelime) {
  let simdikiDurumlar = [];

  sonrakiDurumuEkle(nfa.baslangic, simdikiDurumlar, []);

  for (const sembol of kelime) {
    const sonrakiDurumlar = [];

    for (const state of simdikiDurumlar) {
      //console.log(state);
      const sonrakiDurum = state.baglanti[sembol];
      if (sonrakiDurum) {
        sonrakiDurumuEkle(sonrakiDurum, sonrakiDurumlar, []);
      }
    }

    simdikiDurumlar = sonrakiDurumlar;
  }

  return simdikiDurumlar.find((s) => s.bitisMi) ? true : false;
}

/*
      ara fonksiyonunu donduren yardimci fonksiyon.
  */
function hatirla(nfa, kelime) {
  return ara(nfa, kelime);
}

// let patterns = [];

/*
      girilen metinde eger ic ice pattern varsa, onlari bulan fonksiyon.
  */
function iciceAra(nfa, kelime) {
  let string = "";
  let token;

  for (let i = 0; i < kelime.length; i++) {
    token = kelime[i];
    if (token === " ") {
      while (token === " ") {
        i += 1;
        token = kelime[i];
      }
      string = "";
    }
    string += token;
      if (hatirla(nfa, string) == true) {
        //console.log(string);
        const result = document.getElementById("sonuc");
        const div = document.createElement("div");
        div.textContent = string;
        result.appendChild(div);
      }
  }
  return string;
}

function changeEvent() {
  const result = document.getElementById("sonuc");
  while (result.firstChild) {
    result.removeChild(result.firstChild);
  }
}

/*
        ic ice arama icin gerekli fonksiyon.
  */
function ara2(nfa, kelime) {
  let string1 = iciceAra(nfa, kelime);
  let refString = string1;
  for (let i = 0; i < string1.length - 1; i++) {
    refString = refString.substr(1);

    refString = iciceAra(nfa, refString);
  }
}

/*
      HTML dosyasinda test icin cagrilan fonksiyon.
  */
function createMatcher(exp, kelime) {
  const concatliRegex = concatOperatoruEkle(exp);
  console.log(concatliRegex);
  const postfixRegex = postfixDonusumu(concatliRegex);
  console.log(postfixRegex);
  const nfa = NFADonusumu(postfixRegex);

  const result = document.getElementById("sonuc");
  while (result.firstChild) {
    result.removeChild(result.firstChild);
  }

  const tokens = kelime.split(/(\s+)/);
  let output = "";

  for (const token of tokens) {
    if (token.trim() && hatirla(nfa, token)) {
      output += `<mark>${token}</mark>`;
    } else {
      output += token;
    }
  }

  result.innerHTML = output;
}


