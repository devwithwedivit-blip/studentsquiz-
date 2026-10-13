# QuizForge — Questions For Teacher Review (`REVIEW_FOR_TEACHER.md`)

**Date**: October 13, 2026  
**Target Audience**: Subject Teachers, Academic Coordinators, and Curriculum Leads  
**Purpose**: This document lists questions across the 3,200-question seed bank that contain **time-sensitive facts (`volatile: true`)** or **subtle pedagogical nuances / board curriculum conventions** where teacher discretion or board syllabus updates may require periodic human confirmation.

---

## 1. Time-Sensitive Questions (`volatile: true`)

These questions contain facts, administrative numbers, economic indicators, or curriculum blueprint marks that can change due to government gazettes, international treaties, or annual board updates. They have been tagged with `"volatile": true` in the question bank.

| Question ID | Class & Subject | Question Summary | Current Seed Answer | Why It Needs Periodic Review |
|:---|:---|:---|:---|:---|
| **`c9-gk-064`** | Class 9 GK | Number of sovereign States in the Republic of India | **28 States** (and 8 UTs) | Subject to administrative reorganisations or statehood changes by Parliament under Article 3. |
| **`c10-gk-005`** | Class 10 GK | Number of Fundamental Duties under Article 51A | **11 Fundamental Duties** | Originally 10 (42nd Amendment, 1976); 11th added by 86th Amendment in 2002. Subject to constitutional amendments. |
| **`c10-gk-030`** | Class 10 GK | Largest contributing sector to India's GDP | **Services Sector (~54%)** | Structural economic shifts may adjust the relative sectoral shares of Services, Industry, and Agriculture over multi-year horizons. |
| **`c10-gk-037`** | Class 10 GK | Sovereign member states in UN General Assembly | **193 Members** | Diplomatic admissions (e.g., South Sudan was the 193rd in 2011) can alter total membership. |
| **`c11-gk-084`** | Class 11 GK | India's highest sporting honor renamed in 2021 | **Major Dhyan Chand Khel Ratna** | Renamed from Rajiv Gandhi Khel Ratna Award in August 2021. |
| **`c12-eng-091`** | Class 12 English | Marks allocated to Long Writing Task (Article/Report) | **5 Marks** | CBSE English Core blueprint periodically adjusts mark distributions between reading, writing, and literature. |
| **`c12-gk-042`** | Class 12 GK | Upper tolerance limit of RBI's inflation target | **6% (4% ± 2%)** | Under Section 45ZA of the RBI Act, the 4% ± 2% band is notified by the Central Government every 5 years. |
| **`c12-gk-055`** | Class 12 GK | IMF Special Drawing Rights (SDR) currency basket | **USD, EUR, CNY, JPY, GBP** | IMF Executive Board reviews currency weights and basket composition every 5 years (Chinese Renminbi added in 2016). |

---

## 2. Pedagogical Nuances & Syllabus Conventions (Watchlist)

The following questions have been verified as mathematically and historically correct from first principles, but involve nuances that teachers may wish to emphasize to students:

### A. General Knowledge & History
1. **`c9-gk-005` — Highest Mountain Peak in India**:
   - *Seed Answer*: Kangchenjunga (8,586 m in Sikkim).
   - *Teacher Note*: K2 (Godwin-Austen, 8,611 m) is in Pakistan-administered Gilgit-Baltistan; Nanda Devi (7,816 m in Uttarakhand) is the highest peak *entirely* within undisputed Indian territory. Kangchenjunga is the official standard answer recognized in CBSE/NCERT geography.
2. **`c9-gk-040` — Elevation of Mount Everest**:
   - *Seed Answer*: 8,849 m (tolerance ±1 m accepts 8,848 m).
   - *Teacher Note*: Jointly remeasured by Nepal and China in December 2020 at 8,848.86 m.
3. **`c9-gk-059` — Founding of Azad Hind Fauj (INA)**:
   - *Seed Answer*: Captain Mohan Singh (1942).
   - *Teacher Note*: Netaji Subhas Chandra Bose assumed supreme leadership in Singapore in July 1943. Students often confuse initial conceptualization with Netaji's leadership.
4. **`c10-gk-070` — PSLV Stage Propulsion Architecture**:
   - *Seed Answer*: (B) Both Assertion and Reason are true, but Reason is not the correct explanation of Assertion.
   - *Teacher Note*: PSLV alternates Solid (HTPB) $\rightarrow$ Liquid (Vikas) $\rightarrow$ Solid (HTPB) $\rightarrow$ Liquid (twin engines). The liquid fuel of stage 2 is factual, but does not causally explain why stage 4 is also liquid.

### B. Science & Mathematics
5. **`c9-biology-072` — Diversity in Living Organisms**:
   - *Teacher Note*: Certain taxonomy sections were pruned in the post-2022 rationalized NCERT booklet, but remain core for competitive exams (Olympiad, NTSE, NEET foundation).
6. **`c10-physics-047` — Power Dissipated by Bulbs in Series**:
   - *Seed Answer*: 60 W bulb glows brighter than 100 W bulb when connected in series.
   - *Teacher Note*: Many students mistakenly choose the 100 W bulb because of its parallel rating; in series $P = I^2 R$, and the 60 W bulb has higher resistance ($R = V^2 / P$).
7. **`c10-chemistry-083` — Thermite Reaction Redox Roles**:
   - *Seed Answer*: $\text{Al}$ is the reducing agent; $\text{Fe}_2\text{O}_3$ is the oxidizing agent.
   - *Teacher Note*: Standard high-temperature displacement reaction $\text{Fe}_2\text{O}_3 + 2\text{Al} \rightarrow 2\text{Fe} + \text{Al}_2\text{O}_3$.
8. **`c11-maths-039` — Permutation with Restriction (No two girls adjacent)**:
   - *Seed Answer*: 86,400 ways.
   - *Teacher Note*: 5 boys seated in $5! = 120$ ways creates 6 gaps. 5 girls in 6 gaps = $^{6}P_5 = 720$. Total = $120 \times 720 = 86,400$.
9. **`c12-phy-024` — Net Power of Two Thin Lenses in Contact**:
   - *Seed Answer*: +2 D.
   - *Teacher Note*: Lens 1 ($f = +25\text{ cm} \Rightarrow P_1 = +4\text{ D}$); Lens 2 ($f = -50\text{ cm} \Rightarrow P_2 = -2\text{ D}$); $P = P_1 + P_2 = +2\text{ D}$.

---

## 3. Teacher Action Checklist

- [ ] **Verify Volatile Tags**: In the Question Bank Manager, filter by `"volatile": true` to review all 8 time-sensitive questions before each academic session.
- [ ] **CBSE Blueprint Updates**: Review `c12-eng-091` annually when CBSE releases its September Sample Question Papers (SQP).
- [ ] **Custom Overlays**: Teachers can use the in-app **Edit** button in the Question Bank Manager to update explanations or tolerances without altering the underlying immutable seed files.
