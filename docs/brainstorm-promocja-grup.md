# Brainstorm: Automatyzacja promocji grup (semestr → semestr)

## Cel

- **Obecnie:** Co semestr ręcznie przepisywanie maili, tworzenie/usuwanie grup.
- **Docelowo:** Jedna akcja „promocja” co semestr; grupy „przeskakują” na wyższy semestr; osoby bez promocji (powtarzający) obsłużone bez ręcznego przenoszenia.

---

## Założenia (na przykładzie)

- Kierunek np. **Zarządzanie** → 6 semestrów.
- **12 grup** na Zarządzanie (np. 2 grupy × 6 semestrów, albo inny podział).
- Co semestr: część osób idzie dalej (sem N+1), część zostaje (sem N – powtarzający).

---

## Pomysł 1: Jedna grupa = jeden „strumień” na cały cykl (1–6)

**Model:**  
Grupa to **jeden strumień** na cały czas studiów (np. „Zarządzanie I st. gr 1”, rok rekrutacji 2024/2025).  
Pole **`currentSemester`** (1–6) mówi, na którym semestrze jest ta grupa.  
**Email grupy** zostaje ten sam przez cały cykl (np. `z24-25-gr1@...`) – nie tworzysz nowych maili co semestr.

**Co semestr:**

1. Ustawiasz w systemie „semestr akademicki” (np. 2025/2026 zimowy).
2. Klikasz **„Promuj grupy”**.
3. Dla każdej grupy z `currentSemester < 6` system **nie** zmienia od razu semestru – zamiast tego otwiera się **lista studentów** z możliwością zaznaczenia: **promocja** / **powtarza**.
4. Dla zaznaczonych „promocja”: grupa dostaje `currentSemester += 1` (albo tworzysz „wirtualny” rekord na semestr N+1 – patrz niżej).
5. Dla „powtarza”: student jest **przenoszony** do grupy **powtarzających** dla tego samego semestru (np. „Zarządzanie sem 2 – powtarzający”).

**Plusy:** Jeden mail na cały cykl, mniej tworzenia/usuwania.  
**Minusy:** Trzeba mieć pojęcie „grupa powtarzających sem N” i przenosić tam studentów.

---

## Pomysł 2: Co semestr nowe rekordy grup („klonowanie”)

**Model:**  
Grupy są powiązane z **konkretnym semestrem akademickim** (jak teraz: `semesterId` + `recruitmentYear`).  
Co semestr **nie** usuwasz starych grup – **tworzysz nowe** grupy na semestr N+1 (np. „Zarządzanie sem 3 gr 1”, 2024/2025).

**Akcja „Promuj”:**

1. Wybierasz „Rok rekrutacji” + „Kierunek” (np. Zarządzanie 2024/2025).
2. System pokazuje grupy z semestru 2 (obecny).
3. Dla każdej grupy: przycisk **„Utwórz grupę na sem 3”** – kopiuje nazwę (z poprawką semestru), email (np. ten sam lub nowy według konwencji), `semesterId` = id semestru 2025/2026 zimowy, `recruitmentYear` bez zmian.
4. **Powtarzający:** przed promocją zaznaczasz studentów bez promocji; system **nie** dodaje ich do nowej grupy na sem 3, tylko zostają w starej grupie (sem 2) albo są przenoszeni do jednej grupy „Zarządzanie sem 2 – powtarzający”.

**Plusy:** Spójne z obecnym modelem (grupa = semestr akademicki), plan zajęć dalej wiąże się z konkretnym semestrem.  
**Minusy:** Więcej rekordów grup (nowa grupa co semestr na każdy strumień); trzeba jasno rozdzielić „kto idzie dalej” vs „kto powtarza”.

---

## Pomysł 3: Grupy „powtarzających” zamiast mieszania w jednej grupie

**Niepromowani:**  
Zamiast zostawiać ich w „starej” grupie razem z nowymi rocznikami, zawsze tworzysz **jedną grupę** typu:

- **„Zarządzanie sem 2 – powtarzający”** (rok 2024/2025, semestr 2).

Do tej grupy w akcji „Promuj” przenosisz wszystkich studentów oznaczonych jako „bez promocji” z dowolnej grupy sem 2 (gr 1, gr 2, …).  
Mail np. `z24-25-sem2-powt@...` – jeden mail na wszystkich powtarzających dany semestr.

**Efekt:**

- Grupy „normalne” (gr 1, gr 2) = tylko ci, co idą dalej; można je bezpiecznie „promować” (tworzyć następny semestr).
- Jedna grupa „powtarzający” na kierunek + semestr – łatwe maile, jeden plan, mniej chaosu.

---

## Propozycja łączenia (minimalna automatyzacja)

1. **W grupie (Group)** dodać opcjonalnie:
   - **`curriculumId`** (lub nazwa kierunku) – żeby filtrować „wszystkie grupy Zarządzania”.
   - **`semesterNumber`** (1–6) – numer semestru w cyklu (oprócz `semesterId` = semestr akademicki).

2. **Nowa strona / sekcja w Admin: „Promocja grup”**
   - Wybór: rok rekrutacji, kierunek (jeśli jest curriculum).
   - Lista grup z danego semestru (np. sem 2).
   - Przycisk **„Przygotuj promocję na semestr 3”**:
     - Tworzy nowe grupy (sem 3) z skopiowaną nazwą/emailem/curriculum,
     - Otwiera listę studentów z grup sem 2 z checkboxami „Promocja” / „Powtarza”.
   - Dla „Powtarza”: przeniesienie studenta do grupy **„Sem 2 – powtarzający”** (jedna taka grupa na kierunek+semestr; tworzona automatycznie jeśli nie ma).

3. **Email:**
   - Albo **ten sam** mail dla „gr 1” przez cały cykl (Pomysł 1),
   - Albo **konwencja** np. `z24-25-sem3-gr1@...` przy klonowaniu (Pomysł 2) – wtedy „promocja” = tworzenie grupy z nowym mailem według szablonu.

4. **Osoby bez promocji:**
   - Zawsze **jedna grupa „powtarzający”** na (kierunek, semestr) (Pomysł 3);
   - W akcji „Promuj” zaznaczasz, kto nie zdaje → system ustawia `groupId` u studenta na tę grupę.

---

## Co można wdrożyć krok po kroku

| Krok | Opis                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Dodać do `Group`: `curriculumId?`, `semesterNumber?` (1–6).                                                                                                                     |
| 2    | Na stronie grup: filtrowanie po kierunku, wyświetlanie „Semestr 1–6” z `semesterNumber` lub z `recruitmentYear` + obliczenia.                                                   |
| 3    | Przycisk „Klonuj grupę na następny semestr” (jedna grupa) – tworzy nową grupę z `semesterNumber+1`, ten sam `recruitmentYear`, nowy `semesterId` = następny semestr akademicki. |
| 4    | Sekcja „Promocja”: lista studentów grupy z checkboxem „Promocja” / „Powtarza”; zapis zmiany grupy (assignGroupToStudent) dla powtarzających do grupy „Sem N – powtarzający”.    |
| 5    | Automatyczne tworzenie grupy „Sem N – powtarzający” (jedna na kierunek+semestr) przy pierwszym użyciu.                                                                          |

Daj znać, który wariant (1 vs 2, oraz czy na start tylko „klonowanie” bez powtarzających) chcesz realizować pierwszy – wtedy można to doprecyzować pod Twój dokładny flow (np. skąd bierzecie listę „zdany/niezdany”).
