#!/usr/bin/env node
/**
 * generate-guests.js
 *
 * Generates individual static guest pages under /guests/<slug>.html
 * for each entry in the GUESTS array below. Each page is fully SEO-optimized
 * (canonical, Open Graph, Twitter Card, Person + BreadcrumbList + ItemList
 * JSON-LD) and matches the site's visual style.
 *
 * Episode details are pulled live from the Buzzsprout API at build time,
 * so each page always reflects the current state of the podcast.
 *
 * Usage:  node generate-guests.js
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const BUZZSPROUT_FEED_ID = '2324798';
const BUZZSPROUT_API_TOKEN = '5c913cfdf411f020c10e9bd354f42836';
const SITE_BASE = 'https://psychotherapyandappliedpsychology.com';

// ---------------------------------------------------------------------------
// Guest data
// ---------------------------------------------------------------------------
const GUESTS = [
  // -------------------------------------------------------------------------
  // Original 3 pages
  // -------------------------------------------------------------------------
  {
    slug: 'pimcuijpers',
    name: 'Dr. Pim Cuijpers',
    matchLastName: 'Cuijpers',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTcxNjAyODA3LCJwdXIiOiJibG9iX2lkIn19--a4851d7dfa05f003353db7f67b82d3ed13afeb9f/OIP.webp',
    affiliation: 'Vrije Universiteit Amsterdam',
    role: 'Emeritus Professor of Clinical Psychology',
    shortTagline: 'World-leading meta-analyst of depression, anxiety, and digital mental health interventions.',
    bio: `Dr. Pim Cuijpers is a psychologist and Emeritus Professor of Clinical Psychology at Vrije Universiteit Amsterdam whose research has had a major impact on the study of depression, anxiety, and other common mental disorders. He is especially known for large-scale meta-analyses, randomized trials, and work on prevention, psychotherapy, and digital mental health interventions — helping clarify which treatments work, for whom, and at what intensity.

His scholarship is exceptionally influential, with more than 185,000 citations on Google Scholar. In 2024, he received the American Psychological Association's Award for Distinguished Professional Contributions to Applied Research, becoming the first European to receive it. He is also Editor-in-Chief of the Journal of Consulting and Clinical Psychology, and directs the WHO Collaborating Centre for Research and Dissemination of Psychological Interventions in Amsterdam.`,
    website: 'https://www.pimcuijpers.com/blog/',
    websiteLabel: 'pimcuijpers.com',
    buzzsproutContributor: 'https://www.buzzsprout.com/2324798/contributors/136597-dr-pim-cuijpers',
  },
  {
    slug: 'scottmiller',
    name: 'Dr. Scott Miller',
    matchLastName: 'Scott Miller',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTI0OTU1LCJwdXIiOiJibG9iX2lkIn19--7ad9625bb69c7e56d68d12f39b72e16eedc16fe0/download.jpeg',
    affiliation: 'International Center for Clinical Excellence',
    role: 'Founder & Clinical Psychologist',
    shortTagline: 'Pioneer of feedback-informed treatment and deliberate practice for therapists.',
    bio: `Scott D. Miller, Ph.D. is the founder of the International Center for Clinical Excellence, an international consortium of clinicians, researchers, and educators dedicated to promoting excellence in behavioral health services. Dr. Miller conducts workshops and training in the United States and abroad, helping hundreds of agencies and organizations — both public and private — achieve superior clinical results.

He is one of a handful of "invited faculty" whose work, thinking, and research is featured at the prestigious Evolution of Psychotherapy Conference. His humorous and engaging presentation style and command of the research literature consistently inspires practitioners, administrators, and policy makers to make effective changes in service delivery. His work on feedback-informed care and deliberate practice has reshaped how the field thinks about therapist development.`,
    website: 'https://www.scottdmiller.com/',
    websiteLabel: 'scottdmiller.com',
    buzzsproutContributor: 'https://www.buzzsprout.com/2324798/contributors/79750-dr-scott-miller',
  },
  {
    slug: 'davidbarlow',
    name: 'Dr. David H. Barlow',
    matchLastName: 'Barlow',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTU2MTEzODQ2LCJwdXIiOiJibG9iX2lkIn19--d1a918a7657f3fbb07990b0d639d1035d88ce1df/David-Barlow.jpg',
    affiliation: 'Boston University',
    role: 'Professor Emeritus of Psychology and Psychiatry',
    shortTagline: 'Pioneer of anxiety-disorder research and creator of the Unified Protocol for transdiagnostic treatment.',
    bio: `Dr. David H. Barlow is Professor Emeritus at Boston University. He has authored more than 650 journal articles and chapters and over 90 books and clinical manuals, especially in the areas of anxiety, emotional disorders, evidence-based interventions, and clinical research methods.

He is best known for pioneering work on the etiology, diagnosis, and treatment of anxiety disorders — including conceptual models of generalized anxiety and panic, and the development of the Unified Protocol for transdiagnostic treatment of emotional disorders. He has served on the DSM-IV Task Force, led the Center for Anxiety & Related Disorders, and held leadership roles in the APA and the Association for Behavioral & Cognitive Therapies.

His honors include the APA Distinguished Scientific Award, the Cattell Fellow Award, an APA Presidential Citation, the American Psychological Foundation's Life Achievement Award, and the Wellner Lifetime Achievement Award for Research.`,
    website: 'https://www.bu.edu/psych/profile/david-h-barlow/',
    websiteLabel: 'bu.edu/psych',
    buzzsproutContributor: 'https://www.buzzsprout.com/2324798/contributors/122408-dr-david-h-barlow',
  },

  // -------------------------------------------------------------------------
  // New guest pages — alphabetical by last name
  // -------------------------------------------------------------------------
  {
    slug: 'katieaafjesvandoorn',
    name: 'Dr. Katie Aafjes-van Doorn',
    matchLastName: 'Aafjes',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTI0MjYzLCJwdXIiOiJibG9iX2lkIn19--dee14b2864fd8115541089f9b05029489584f461/Van_Doorn_Katie_300.png',
    affiliation: 'NYU Shanghai',
    role: 'Associate Professor of Psychology',
    shortTagline: 'Psychotherapy researcher investigating therapist responsiveness, teletherapy effectiveness, and the factors that drive outcomes in real-world clinical practice.',
    bio: `Dr. Katie Aafjes-van Doorn is an Associate Professor of Psychology at NYU Shanghai. She completed her MSc in Clinical Psychology and her Doctorate at the University of Oxford, and has since built an international research program focused on psychotherapy process and outcome. She is especially interested in how therapists adapt their work to individual clients — a concept known as responsiveness — and what that responsiveness means for treatment effectiveness.

Her research on teletherapy has been particularly influential, providing some of the most rigorous evidence to date on whether online psychotherapy is comparably effective to in-person treatment. She has published more than 60 peer-reviewed articles and has collaborated with researchers across Europe and North America. Her work bridges clinical practice and empirical research, helping therapists make better-informed decisions about how and when to adapt their approach.`,
    website: 'https://shanghai.nyu.edu/academics/faculty/directory/katie-aafjes-van-doorn',
    websiteLabel: 'nyu.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'stephaniebudge',
    name: 'Dr. Stephanie Budge',
    matchLastName: 'Budge',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQxMzQ4NTA1LCJwdXIiOiJibG9iX2lkIn19--f6d4507795bdfb896b5103c1e073238221d757ee/OIP.jpeg',
    affiliation: 'University of Wisconsin-Madison',
    role: 'Professor of Counseling Psychology',
    shortTagline: 'Leading researcher on the mental health and well-being of transgender, nonbinary, and gender diverse individuals, and how psychotherapy can better serve these communities.',
    bio: `Dr. Stephanie Budge is a Professor of Counseling Psychology at the University of Wisconsin-Madison. Her research program is dedicated to understanding and improving the mental health of transgender, Two-Spirit, nonbinary, and gender diverse (TGD) individuals. She examines the psychological processes that promote resilience and well-being in these communities, with particular attention to coping, identity development, and the role of social support.

She has published widely on affirmative psychotherapy approaches for gender diverse clients, and her work has directly informed clinical guidelines and training programs for therapists working with TGD populations. Dr. Budge is a Fellow of the American Psychological Association and has received numerous awards for her contributions to LGBTQ+ mental health research. Her scholarship challenges mental health professionals to move beyond compliance toward genuine companionship and solidarity with gender diverse clients.`,
    website: 'https://counselingpsych.education.wisc.edu/fac-staff/budge-stephanie/',
    websiteLabel: 'wisc.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'craigbryan',
    name: 'Dr. Craig Bryan',
    matchLastName: 'Bryan',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQyMTQxMjMzLCJwdXIiOiJibG9iX2lkIn19--f29b225ce503ce464fe40946ba466b510e5c5d0d/OIP%20(1).jpeg',
    affiliation: 'The Ohio State University',
    role: 'STAR Professor of Psychology',
    shortTagline: 'Board-certified clinical psychologist and one of the world\'s leading suicide prevention researchers, with a focus on effective interventions for military and veteran populations.',
    bio: `Dr. Craig Bryan is a STAR (Stress, Trauma, and Resilience) Professor of Psychology at The Ohio State University and one of the most prolific researchers in the field of suicide prevention. He is a board-certified clinical psychologist whose work has substantially advanced understanding of suicide risk among military service members and veterans — populations that face distinctive stressors complicating both assessment and intervention.

Dr. Bryan has led numerous clinical trials testing the effectiveness of brief, structured interventions for suicidal ideation and behavior, including Brief Cognitive Behavioral Therapy for Suicide Prevention (BCBT). This treatment is now among the most evidence-supported interventions available for suicidal service members and has been adopted across multiple military and VA healthcare settings. He has published hundreds of peer-reviewed articles and several books, and his research has directly shaped clinical guidelines and policy within the Department of Defense and the Veterans Health Administration.`,
    website: 'https://suicidepreventiontherapy.com/',
    websiteLabel: 'suicidepreventiontherapy.com',
    buzzsproutContributor: null,
  },
  {
    slug: 'carlcastro',
    name: 'Dr. Carl Castro',
    matchLastName: 'Castro',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTM4MTU1ODEzLCJwdXIiOiJibG9iX2lkIn19--bacee49e4649b0b59bd0e19a82a215a8cb26c060/CarlCastro250.png',
    affiliation: 'University of Southern California',
    role: 'Professor of Social Work & Retired Army Colonel',
    shortTagline: 'Military psychologist, retired Army colonel with 33 years of service, and pioneer of research on the psychological effects of combat and military-to-civilian transition.',
    bio: `Dr. Carl Castro is a Professor at the University of Southern California's Suzanne Dworak-Peck School of Social Work and a retired U.S. Army colonel with a distinguished 33-year military career. He served as the Director of the Military Operational Medicine Research Program at the U.S. Army Medical Research and Materiel Command, overseeing research aimed at optimizing soldier performance and resilience under combat conditions. His work has been instrumental in shaping military behavioral health policy at the highest levels of government.

Dr. Castro has authored more than 150 scientific publications on topics including the psychological effects of combat, the unique challenges of military-to-civilian transition, unit cohesion, and organizational factors that influence service member well-being. He has testified before Congress and advised senior military and civilian leaders on evidence-based approaches to mental health care for the armed forces. His dual perspective — as both a soldier and a scientist — gives his work an unusual depth and credibility that has made him one of the most respected figures in military psychology.`,
    website: 'https://dworakpeck.usc.edu/academics/faculty-directory/carl-castro',
    websiteLabel: 'usc.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'michaelconstantino',
    name: 'Dr. Michael J. Constantino',
    matchLastName: 'Constantino',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTUyMzE0MDkwLCJwdXIiOiJibG9iX2lkIn19--071ab2f29356836379fba6d50c0f6f653f9a840a/111567_web.jpg',
    affiliation: 'University of Massachusetts Amherst',
    role: 'Professor of Clinical Psychology',
    shortTagline: 'Psychotherapy researcher who developed the context-responsive psychotherapy integration framework — a science-based approach to matching therapy to the individual patient.',
    bio: `Dr. Michael J. Constantino is a Professor of Clinical Psychology at the University of Massachusetts Amherst and the director of the Psychotherapy Research Lab. He is the primary architect of the context-responsive psychotherapy integration framework, which provides a principled, evidence-based method for tailoring treatment to each patient's unique presentation, preferences, and context — without abandoning the rigor of structured, evidence-based care.

Dr. Constantino has published more than 215 articles and chapters on psychotherapy process and outcome, patient-therapist matching, expectation and alliance formation, and the mechanisms of therapeutic change. His work bridges research and practice, offering clinicians practical tools for personalizing care while maintaining accountability to the evidence base. He is a Fellow of the American Psychological Association and has received sustained funding from NIH and other national agencies for his research program.`,
    website: 'https://sites.google.com/site/constantinotherapyresearchlab/',
    websiteLabel: 'Research Lab',
    buzzsproutContributor: null,
  },
  {
    slug: 'kencritchfield',
    name: 'Dr. Ken Critchfield',
    matchLastName: 'Critchfield',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMxOTg0NTE2LCJwdXIiOiJibG9iX2lkIn19--0fa530405525e00daab1ec71542d7799ff238d81/IMG_2441.png',
    affiliation: 'Yeshiva University',
    role: 'Associate Professor & Program Director of Clinical Psychology',
    shortTagline: 'Clinical psychologist and expert in Interpersonal Reconstructive Therapy and the Structural Analysis of Social Behavior — tools for understanding the deep interpersonal roots of psychological distress.',
    bio: `Dr. Ken Critchfield is an Associate Professor and Program Director of Clinical Psychology at Yeshiva University's Ferkauf Graduate School of Psychology. His work centers on Interpersonal Reconstructive Therapy (IRT) and the Structural Analysis of Social Behavior (SASB) — a system for mapping and understanding interpersonal patterns in psychotherapy and everyday relationships. He has been a leading figure in applying these frameworks to clinical practice and training.

Dr. Critchfield's research examines how early relational experiences shape adult interpersonal patterns, and how those patterns manifest in the therapy relationship itself. His scholarship connects personality theory, empirical assessment, and clinical intervention, and he has trained clinicians internationally in the use of SASB. His work is particularly relevant to therapists treating clients with personality disorders, trauma histories, or chronic relationship difficulties.`,
    website: 'https://www.yu.edu/faculty/pages/critchfield-ken',
    websiteLabel: 'yu.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'jonelhai',
    name: 'Dr. Jon Elhai',
    matchLastName: 'Elhai',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTI0NTI2LCJwdXIiOiJibG9iX2lkIn19--049b5bf2adcbd280c91567381cfc45c6367e013b/2019pic.jpg',
    affiliation: 'University of Toledo',
    role: 'Distinguished University Professor of Psychology',
    shortTagline: 'Cyberpsychologist studying how problematic smartphone and social media use affects mental health, anxiety, and daily functioning.',
    bio: `Dr. Jon Elhai is a Distinguished University Professor at the University of Toledo and one of the foremost researchers on cyberpsychology and the mental health consequences of technology use. His work examines problematic smartphone use, social media addiction, and internet-related anxiety — questions that have become increasingly urgent as digital devices become ever more central to daily life.

Dr. Elhai has published extensively on how patterns of problematic technology use relate to depression, anxiety, loneliness, and impaired functioning. He draws on both quantitative and psychometric methods to study these phenomena, developing and validating assessment tools that are now widely used in research and clinical settings around the world. His scholarship sits at the intersection of clinical psychology, behavioral addiction research, and communications science, and has generated important insights into how and why smartphones can become sources of psychological distress.`,
    website: 'https://www.jon-elhai.com/home',
    websiteLabel: 'jon-elhai.com',
    buzzsproutContributor: null,
  },
  {
    slug: 'catherineeubanks',
    name: 'Dr. Catherine F. Eubanks',
    matchLastName: 'Eubanks',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTM5MzQ5MTMwLCJwdXIiOiJibG9iX2lkIn19--e159e2e4c98da8affec8869a4b5b8309556181d5/Catherine-Eubanks.jpg',
    affiliation: 'Adelphi University',
    role: 'Professor of Clinical Psychology',
    shortTagline: 'Expert in therapeutic alliance ruptures — researching how breakdowns in the therapy relationship can be recognized, repaired, and used as catalysts for change.',
    bio: `Dr. Catherine F. Eubanks is a Professor of Clinical Psychology at Adelphi University and a leading researcher on the therapeutic alliance, with particular expertise in alliance rupture and repair. Her work has transformed how the field understands the subtle and overt ways the collaborative bond between therapist and client can deteriorate — and what therapists can do to identify and resolve these ruptures before they threaten the therapy.

Dr. Eubanks has developed behavioral coding systems for identifying ruptures in session recordings, conducted psychotherapy process research across multiple treatment approaches, and led international workshops training clinicians in rupture recognition and repair. She is co-author of influential work on therapeutic alliance and has collaborated with leading researchers in the field. Her scholarship reflects a deep commitment to making psychotherapy more relational, more responsive, and ultimately more effective.`,
    website: 'https://www.adelphi.edu/faculty/profiles/profile.php?PID=1023',
    websiteLabel: 'adelphi.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'nadyafouad',
    name: 'Dr. Nadya Fouad',
    matchLastName: 'Fouad',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTM3NzU5LCJwdXIiOiJibG9iX2lkIn19--ffdf82ca4e4b75df6330bdf5786932d5afd004c5/th.jpeg',
    affiliation: 'University of Wisconsin-Milwaukee',
    role: 'Professor of Counseling Psychology',
    shortTagline: 'Vocational psychologist examining how cultural context shapes women\'s career development, career barriers, and the social factors that influence work and career decisions.',
    bio: `Dr. Nadya Fouad is a Professor of Counseling Psychology at the University of Wisconsin-Milwaukee and a Board Certified Counseling Psychologist. Her research focuses on vocational psychology and career development, with particular emphasis on the cultural factors that shape how people — especially women from diverse backgrounds — make work-related decisions, experience career barriers, and navigate professional environments.

She is a past president of APA Division 17 (Society of Counseling Psychology) and has received the Leona Tyler Award, the highest honor in counseling psychology. Dr. Fouad has published more than 100 articles and chapters, and her work has had lasting influence on how the field conceptualizes the intersection of culture, identity, and career. She has been especially important in expanding vocational theory to account for systemic barriers and the diverse lived experiences of people historically underrepresented in research.`,
    website: 'https://uwm.edu/education/directory/fouad-nadya/',
    websiteLabel: 'uwm.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'josiegeller',
    name: 'Dr. Josie Geller',
    matchLastName: 'Geller',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQzMDg4NzI0LCJwdXIiOiJibG9iX2lkIn19--3faf970b3453cc92dc926943fa5c79eeea475e01/JosieGeller.jpeg',
    affiliation: 'University of British Columbia / St. Paul\'s Hospital',
    role: 'Associate Professor & Director of Eating Disorders Research',
    shortTagline: 'Eating disorder researcher focused on motivation, readiness to change, and self-compassion as pathways to recovery.',
    bio: `Dr. Josie Geller is a psychologist and Associate Professor at the University of British Columbia's Department of Psychiatry, and Director of Research for the Eating Disorders Program at St. Paul's Hospital in Vancouver. Her research is focused on understanding and improving treatment outcomes for individuals with eating disorders, with a particular emphasis on client motivation, readiness to change, and the therapeutic relationship.

She developed the Short Treatment Allocation Tool for Eating Disorders (STADE) and has contributed substantially to research on how to match treatment intensity to client readiness. Dr. Geller's work on self-compassion in eating disorder recovery has broken important new ground, suggesting that the way clients relate to themselves — with kindness rather than self-criticism — may be as important as any specific therapeutic technique. She has published widely, received major research funding, and trained numerous clinicians in her approaches.`,
    website: 'https://psychiatry.ubc.ca/josie-geller/',
    websiteLabel: 'psychiatry.ubc.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'simongoldberg',
    name: 'Dr. Simon Goldberg',
    matchLastName: 'Simon Goldberg',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTQ0ODUzLCJwdXIiOiJibG9iX2lkIn19--13c51e236ec11a6947993710fc2d98b6fe40be98/OIP%20(1).jpeg',
    affiliation: 'University of Wisconsin-Madison',
    role: 'Associate Professor of Counseling Psychology',
    shortTagline: 'Researcher at the forefront of mindfulness-based therapies and digital mental health, studying what makes these approaches work and for whom.',
    bio: `Dr. Simon Goldberg is an Associate Professor of Counseling Psychology at the University of Wisconsin-Madison, where he leads a research program on the effectiveness of mindfulness-based interventions, digital mental health tools, and psychotherapy more broadly. His work applies rigorous quantitative and meta-analytic methods to understand both whether treatments work and the mechanisms through which they produce their effects.

His research on mindfulness and meditation has clarified when and for whom these practices are most beneficial, examining outcomes across diverse clinical and non-clinical populations. He has also been a thoughtful critic of the psychotherapy literature's methodological limitations, contributing to important debates about effect size interpretation, researcher allegiance, and replication. Dr. Goldberg's commitment to methodological rigor makes his work an important anchor in a field that can sometimes move faster than the evidence warrants.`,
    website: 'https://counselingpsych.education.wisc.edu/fac-staff/goldberg-simon/',
    websiteLabel: 'wisc.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'rodneygoodyear',
    name: 'Dr. Rodney Goodyear',
    matchLastName: 'Goodyear',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQ3MDExMTcyLCJwdXIiOiJibG9iX2lkIn19--47890c4c2e765f1741c657a57ac405d9f19330f8/download%20(1).jpeg',
    affiliation: 'University of Redlands',
    role: 'Professor of Psychology',
    shortTagline: 'Pioneer of clinical supervision research whose work has shaped how the field trains and evaluates the next generation of therapists.',
    bio: `Dr. Rodney Goodyear is a Professor of Psychology at the University of Redlands and one of the most influential scholars in the history of clinical supervision research. Over a career spanning five decades, his work has examined how supervision works, what distinguishes effective supervisors, and how training environments shape the development of competent and ethical clinicians. He received the APA Distinguished Career Award for Education and Training in recognition of his lifetime contributions.

Dr. Goodyear has authored and edited major texts in supervision and counselor education, and his conceptual models have become foundational references in training programs worldwide. He has examined supervision from multiple angles — including the supervisor-trainee relationship, the impact of theory on supervisory practice, and the cultural dimensions of clinical training. His influence extends across counseling psychology, clinical psychology, and marriage and family therapy.`,
    website: 'https://www.redlands.edu/faculty-and-staff-directory/school-of-education/rod-goodyear',
    websiteLabel: 'redlands.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'jillharkavyfriedman',
    name: 'Dr. Jill Harkavy-Friedman',
    matchLastName: 'Harkavy-Friedman',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQzOTc5OTQwLCJwdXIiOiJibG9iX2lkIn19--716a0904d38cc268eb183da997e475463949487e/1578571690-jill-harkavy-friedman.webp',
    affiliation: 'American Foundation for Suicide Prevention',
    role: 'Senior Vice President of Research',
    shortTagline: 'Clinician and researcher with 35+ years of experience turning suicide science into real-world prevention strategies, education, and policy change.',
    bio: `Dr. Jill Harkavy-Friedman is the Senior Vice President of Research at the American Foundation for Suicide Prevention (AFSP), the largest private funder of suicide research in the United States. With more than 35 years as both a clinician and researcher, she has been at the center of the effort to translate suicide science into prevention programs, professional education, and public awareness campaigns that actually reach people at risk.

She has published more than 100 peer-reviewed articles on suicide risk, protective factors, and intervention approaches, and has been a consistent voice for evidence-based practice in suicide prevention. Dr. Harkavy-Friedman is also deeply committed to reducing the stigma surrounding mental health and suicidality — a theme that runs through her research, her advocacy, and her public-facing work. Her career reflects a conviction that the science of suicide is ultimately in service of keeping people alive.`,
    website: 'https://afsp.org/',
    websiteLabel: 'afsp.org',
    buzzsproutContributor: null,
  },
  {
    slug: 'paulhewitt',
    name: 'Dr. Paul Hewitt',
    matchLastName: 'Hewitt',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMyODA5NTA1LCJwdXIiOiJibG9iX2lkIn19--114efb975805f85136b088f2086dac002912c0e1/PaulHewittImage%20copy.jpeg',
    affiliation: 'University of British Columbia',
    role: 'Professor of Psychology',
    shortTagline: 'One of the world\'s foremost authorities on perfectionism — including its multidimensional nature, its role in psychopathology, and its treatment.',
    bio: `Dr. Paul Hewitt is a Professor of Psychology at the University of British Columbia and one of the world's leading researchers on perfectionism. His work has fundamentally shaped how the field understands perfectionism as a multidimensional construct — not just high personal standards, but also the demanding expectations people impose on others and the sense that others demand perfection from them. This three-part model has generated an enormous body of research linking perfectionism to depression, anxiety, eating disorders, and suicidal tendencies.

Dr. Hewitt has developed widely used measures of perfectionism and has published extensively on its clinical implications, including how perfectionism operates within the therapy relationship and what kinds of interventions are most effective. He leads the Perfectionism and Psychopathology Lab at UBC and has trained numerous graduate students and clinicians. His research has been recognized with multiple national and international awards for its scientific and clinical impact.`,
    website: 'https://hewittlab.psych.ubc.ca/',
    websiteLabel: 'hewittlab.psych.ubc.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'jameshill',
    name: 'Dr. James O. Hill',
    matchLastName: 'James Hill',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTU0MzQ3NjkxLCJwdXIiOiJibG9iX2lkIn19--437e6622c933e886b10d7cdb2b97dd7e6d77fa03/jim-hill-headshot-800x1120.jpg',
    affiliation: 'University of Alabama at Birmingham',
    role: 'Professor of Nutrition Sciences',
    shortTagline: 'Pioneer of obesity science and co-founder of the National Weight Control Registry — the largest ongoing study of successful long-term weight loss maintenance.',
    bio: `Dr. James O. Hill is a Professor of Nutrition Sciences at the University of Alabama at Birmingham and one of the world's leading researchers on the science of obesity, energy balance, and weight management. Over more than four decades of research, he has made foundational contributions to understanding why people gain weight, why long-term weight loss is so difficult, and what distinguishes the rare individuals who succeed.

He co-founded the National Weight Control Registry (NWCR) — the largest ongoing longitudinal study of individuals who have maintained significant weight loss — and has used NWCR data to identify the behavioral strategies that separate successful maintainers from those who regain. Dr. Hill has published more than 650 peer-reviewed papers and has been deeply involved in national obesity policy. His more recent work on GLP-1 receptor agonists like Ozempic explores how these medications interact with behavioral approaches, representing some of the most timely research in contemporary obesity science.`,
    website: 'https://scholars.uab.edu/6698-james-hill/',
    websiteLabel: 'scholars.uab.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'davidkealy',
    name: 'Dr. David Kealy',
    matchLastName: 'Kealy',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTU1MjAwNTc3LCJwdXIiOiJibG9iX2lkIn19--df4fdc808a48b4551e196a1f94e93895537bcbd2/David-Kealy-2.webp',
    affiliation: 'University of British Columbia',
    role: 'Associate Professor of Psychiatry',
    shortTagline: 'Psychotherapy researcher studying how patients test and coach their therapists — and what this reveals about identity, personality, and the relational fabric of treatment.',
    bio: `Dr. David Kealy is an Associate Professor in the Department of Psychiatry at the University of British Columbia, where he leads the Identity and Psychotherapy Process Lab. His research centers on psychotherapy processes and outcomes, with a particular focus on how identity-related difficulties and personality functioning shape the therapeutic relationship. He is especially interested in the subtle, often unconscious ways clients influence and direct their therapists — a phenomenon he has described as patients "coaching" their therapists through implicit relational communication.

Dr. Kealy is a registered clinical psychologist and a fellow of the International Society for the Study of Personality Disorders. He has published extensively on personality pathology, interpersonal processes in therapy, and psychodynamic approaches to contemporary clinical work. His research is known for bringing rigorous empirical methods to questions that have historically been the domain of clinical theory and case description, helping close the gap between what therapists observe in the room and what the science can explain.`,
    website: 'https://psychiatry.ubc.ca/david-kealy/',
    websiteLabel: 'psychiatry.ubc.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'denniskivlighan',
    name: 'Dr. Dennis Kivlighan',
    matchLastName: 'Kivlighan',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTM2NDQ5NjkyLCJwdXIiOiJibG9iX2lkIn19--231a099d6cf4135449676e91d61c4fb40ffc6c53/Dennis-Martin-Kivlighan.jpg',
    affiliation: 'University of Maryland',
    role: 'Professor of Counseling Psychology',
    shortTagline: 'World leader in group psychotherapy research, editor of the Journal of Counseling Psychology, and recipient of the Lifetime Achievement Award from the American Counseling Association.',
    bio: `Dr. Dennis Kivlighan is a Professor of Counseling Psychology at the University of Maryland and is widely recognized as one of the preeminent researchers in group psychotherapy. For decades his work has examined the processes through which group therapy produces change — including therapeutic factors, group cohesion, interpersonal learning, and the role of the group leader. He has served as editor of the Journal of Counseling Psychology, the flagship journal in the discipline, and received the Lifetime Achievement Award from the American Counseling Association.

His methodological contributions are as significant as his substantive ones. Dr. Kivlighan has been a pioneer in applying multilevel and social network analysis methods to group therapy data, allowing researchers to disentangle the contributions of individual members, dyadic pairings, and the group as a whole. This has opened new windows onto how group-level processes unfold and how they can be leveraged therapeutically. His work continues to set the methodological and conceptual standard for process-outcome research in both group and individual therapy.`,
    website: 'https://education.umd.edu/directory/dennis-kivlighan',
    websiteLabel: 'education.umd.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'davidklonsky',
    name: 'Dr. E. David Klonsky',
    matchLastName: 'Klonsky',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTI0NTk5LCJwdXIiOiJibG9iX2lkIn19--5ff5cf562a40f842b67f3793ca31eb8b451bd823/UBC_20211104_PJ_5651-Printing-Res-3.jpg',
    affiliation: 'University of British Columbia',
    role: 'Professor of Psychology',
    shortTagline: 'Developer of the Three-Step Theory of Suicide (3ST) — a parsimonious, empirically-supported model explaining why some people move from suicidal ideation to action.',
    bio: `Dr. E. David Klonsky is a Professor of Psychology at the University of British Columbia, where his research examines the nature, causes, and consequences of suicidal thoughts and behaviors, as well as non-suicidal self-injury (NSSI). He is best known for developing the Three-Step Theory of Suicide (3ST) — an influential and evidence-informed model that explains suicide risk in terms of psychological pain, hopelessness, and connectedness, with particular emphasis on distinguishing the many people who have suicidal ideation from the smaller number who go on to attempt suicide.

Dr. Klonsky has published more than 150 peer-reviewed articles and his research has received consistent CIHR funding. His work on the ideation-to-action distinction has reshaped how the field conceptualizes suicide and how clinicians should assess and intervene with clients at different points in this trajectory. He has also made major contributions to the conceptual and empirical literature on NSSI, helping establish it as a clinically and theoretically distinct phenomenon from suicidal behavior.`,
    website: 'https://psych.ubc.ca/profile/david-klonsky/',
    websiteLabel: 'psych.ubc.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'richardkoestner',
    name: 'Dr. Richard Koestner',
    matchLastName: 'Koestner',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTU2OTU0OTQ5LCJwdXIiOiJibG9iX2lkIn19--e37b184f95425823c36e6a7258f1071f32d54963/download%20(3).jpeg',
    affiliation: 'McGill University',
    role: 'Professor of Psychology',
    shortTagline: 'Self-determination theorist and motivation researcher studying how to cultivate autonomous motivation, effective goal pursuit, and psychological well-being across the lifespan.',
    bio: `Dr. Richard Koestner is a Professor of Psychology at McGill University and the director of the McGill Human Motivation Lab. His research focuses on human motivation, self-regulation, and goal pursuit — particularly on how to help people move from external pressures and introjected obligations toward genuine, autonomous motivation that is self-sustaining and satisfying. He is a leading contributor to Self-Determination Theory, one of the most empirically supported frameworks in motivational psychology.

Dr. Koestner's work has practical implications for parenting, education, healthcare, and psychotherapy — anywhere that motivation and behavior change are central concerns. He has published more than 150 articles and chapters, collaborating with researchers around the world on questions about identity, internalization, and the conditions that support lasting positive change. His longitudinal research on goal pursuit has been especially influential, showing how the qualities of goals — not just their content — determine whether they lead to satisfaction and success.`,
    website: 'https://www.mcgill.ca/psychology/richard-koestner',
    websiteLabel: 'mcgill.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'robertkrueger',
    name: 'Dr. Robert Krueger',
    matchLastName: 'Krueger',
    photo: 'https://psychotherapyandappliedpsychology.com/images/krueger.jpg',
    affiliation: 'University of Minnesota',
    role: 'Professor of Psychology',
    shortTagline: 'Architect of the Hierarchical Taxonomy of Psychopathology (HiTOP) and key developer of the DSM-5\'s Alternative Model for Personality Disorders (AMPD).',
    bio: `Dr. Robert Krueger is a Professor of Psychology at the University of Minnesota and one of the most influential figures in the science of psychopathology structure and personality disorders. He is a co-developer of the Alternative Model for Personality Disorders (AMPD) included in DSM-5 Section III, and one of the principal architects of the Hierarchical Taxonomy of Psychopathology (HiTOP) — a comprehensive, empirically-derived alternative to traditional categorical diagnosis that organizes mental disorders by their relationships and shared underlying dimensions.

Dr. Krueger's work has been transformative for the field, offering a framework that better reflects the actual covariation among mental disorders and promises more clinically informative assessments. He is a Fellow of the Association for Psychological Science and has received multiple major awards recognizing his contributions to personality research and psychopathology. His research spans behavior genetics, quantitative psychology, and clinical science, and has produced more than 300 peer-reviewed publications.`,
    website: 'https://cla.umn.edu/psychology/news-events/profile/robert-krueger',
    websiteLabel: 'cla.umn.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'uelikramer',
    name: 'Dr. Ueli Kramer',
    matchLastName: 'Kramer',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTM1NDg0OTc0LCJwdXIiOiJibG9iX2lkIn19--0fbe68a1dbc8b25d1ea8b0336fe122fdbc4639e0/download.jpeg',
    affiliation: 'University of Lausanne',
    role: 'Professor & Director, University Institute of Psychotherapy',
    shortTagline: 'Psychotherapy process researcher and personality disorder specialist studying what actually changes — and why — in the treatment of complex, chronic psychological difficulties.',
    bio: `Dr. Ueli Kramer is a Professor at the University of Lausanne and directs the University Institute of Psychotherapy. His research examines the mechanisms of psychotherapeutic change, with a particular focus on personality disorders and the processes that underlie treatment response in clients who present with complex, chronic difficulties. He is interested in how moment-to-moment experiences in therapy — emotional processing, self-reflection, interpersonal perception — translate into lasting change outside the consulting room.

Dr. Kramer has developed and evaluated several treatment approaches for personality disorders, contributing both to their conceptual foundations and their empirical validation. He has published extensively in European and international journals and has collaborated with researchers across Switzerland, France, and North America. His work brings together psychotherapy process research, clinical psychology, and psychopathology in a way that is grounded in the real-world complexities of treating personality disorder.`,
    website: 'https://edpub.unil.ch/interpub/noauth/php/Un/UnPers.php?PerNum=1264947&LanCode=8&menu=rech',
    websiteLabel: 'unil.ch',
    buzzsproutContributor: null,
  },
  {
    slug: 'matthewlarge',
    name: 'Dr. Matthew Large',
    matchLastName: 'Matthew Large',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTI1MjI0LCJwdXIiOiJibG9iX2lkIn19--cd794a487a0e204b2cdb874a85f04e4dd588f73e/OIP.jpeg',
    affiliation: 'University of New South Wales',
    role: 'Conjoint Professor of Psychiatry',
    shortTagline: 'Psychiatrist and researcher who has led the evidence-based critique of clinical suicide risk assessment — arguing that prediction-based models fail patients and must be replaced.',
    bio: `Dr. Matthew Large is a Conjoint Professor at the University of New South Wales and Clinical Director of Mental Health in the Eastern Suburbs Mental Health Service in Sydney, Australia. He is one of the world's most prominent critics of traditional approaches to suicide risk assessment, arguing on the basis of systematic research that the tools clinicians use to categorize patients as high or low risk have little predictive validity and may actively harm patients by substituting false certainty for genuine clinical engagement.

His meta-analytic and epidemiological work has demonstrated that even the best available risk assessment instruments perform poorly at identifying individuals who will make future suicide attempts, and that their widespread use reflects professional anxiety rather than scientific evidence. Dr. Large advocates for approaches that prioritize therapeutic alliance, needs-based care, and honest uncertainty rather than risk stratification. His scholarship has provoked important debates about clinical practice, professional liability, and the ethics of suicide prevention.`,
    website: 'https://www.unsw.edu.au/staff/matthew-large',
    websiteLabel: 'unsw.edu.au',
    buzzsproutContributor: null,
  },
  {
    slug: 'ronlevant',
    name: 'Dr. Ron Levant',
    matchLastName: 'Levant',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTM3OTE1LCJwdXIiOiJibG9iX2lkIn19--cc637c30d9ee0ef8983e7732c78a5297fac70fd0/download.jpeg',
    affiliation: 'University of Akron',
    role: 'Professor Emeritus of Psychology',
    shortTagline: 'Former APA President and the field\'s foremost scholar on the psychology of men and masculinities — including how traditional masculinity ideology shapes men\'s emotional lives.',
    bio: `Dr. Ron Levant is a Professor Emeritus at the University of Akron and a past president of the American Psychological Association (2005). He is widely recognized as one of the founding figures of the psychology of men and masculinities — an area he helped establish as a rigorous, empirically grounded specialty within clinical and counseling psychology. His concept of normative male alexithymia — the emotional inexpressiveness that traditional masculine socialization produces in many men — has been enormously influential in both research and clinical practice.

Dr. Levant has authored or co-authored 19 books and more than 250 peer-reviewed articles, and has developed assessment tools for measuring masculinity ideology that are used in research worldwide. During his APA presidency he launched an initiative to increase the representation of evidence-based practices in psychology. His work has opened important conversations about how men experience distress, why they often avoid seeking help, and what therapists need to understand to engage them effectively.`,
    website: 'https://www.drronaldlevant.com/',
    websiteLabel: 'drronaldlevant.com',
    buzzsproutContributor: null,
  },
  {
    slug: 'jasonluoma',
    name: 'Dr. Jason Luoma',
    matchLastName: 'Luoma',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTY5NDc3MTg5LCJwdXIiOiJibG9iX2lkIn19--91384674a035b5ae9d305ce42d18c2c52bd98367/download.webp',
    affiliation: 'Portland Institute for Psychedelic Science',
    role: 'Psychologist & Researcher',
    shortTagline: 'ACT researcher and psychedelic-assisted therapy pioneer studying shame, stigma, and how altered states of consciousness can catalyze psychological transformation.',
    bio: `Dr. Jason Luoma is a psychologist and researcher based in Portland, Oregon, and co-founder of the Portland Institute for Psychedelic Science — one of the leading centers for research on the psychological mechanisms and clinical applications of psychedelic-assisted therapy. His work sits at a compelling intersection: Acceptance and Commitment Therapy (ACT), shame and self-stigma, and the emerging science of psychedelic medicine, exploring how these frameworks illuminate and interact with one another.

Before turning to psychedelic research, Dr. Luoma was already recognized for his contributions to ACT — particularly in understanding shame and its role in social anxiety, substance use disorders, and self-stigma. He co-authored an influential ACT textbook and published numerous peer-reviewed articles on psychological flexibility and behavior change. His current research examines what happens psychologically during psychedelic experiences, including psilocybin-assisted therapy, and how those experiences can produce lasting reductions in shame, depression, and substance misuse.`,
    website: 'https://jasonluoma.com/',
    websiteLabel: 'jasonluoma.com',
    buzzsproutContributor: null,
  },
  {
    slug: 'alexandralysova',
    name: 'Dr. Alexandra Lysova',
    matchLastName: 'Lysova',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTUxNTI4OTE5LCJwdXIiOiJibG9iX2lkIn19--7fab4ff11679042598c12336dd57a8e7e6e68767/download%20(2).jpeg',
    affiliation: 'Simon Fraser University',
    role: 'Professor, School of Criminology',
    shortTagline: 'Leading researcher on intimate partner violence, with a focus on male victimization and bidirectional violence — challenging one-sided frameworks in both research and policy.',
    bio: `Dr. Alexandra Lysova is a Professor in the School of Criminology at Simon Fraser University. Her research focuses on intimate partner violence (IPV), with particular attention to dimensions of victimization that are frequently overlooked — including the experiences of men as victims and the prevalence of bidirectional or mutual violence in intimate relationships. She is one of the world's leading voices challenging gender-exclusive frameworks for understanding domestic violence and advocating for a more empirically complete picture.

She has authored more than 70 peer-reviewed publications and her work has been recognized internationally for its rigor and its important implications for clinical practice, legal systems, and social services. Dr. Lysova's scholarship bridges criminology, clinical psychology, and public health, and she has presented her research at conferences around the world. Her findings have contributed to significant policy conversations about how IPV services, interventions, and legal responses should be designed and who they should serve.`,
    website: 'https://www.sfu.ca/criminology/about/faculty/criminology-faculty/alexandra-lysova.html',
    websiteLabel: 'sfu.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'maheshmenon',
    name: 'Dr. Mahesh Menon',
    matchLastName: 'Menon',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQ4Mzk0NDc3LCJwdXIiOiJibG9iX2lkIn19--421c7e4b67f93134fac0a0b5fb53549bbcd9e8dc/cropped-Mahesh-Menon.jpg',
    affiliation: 'University of British Columbia',
    role: 'Clinical Associate Professor of Psychiatry',
    shortTagline: 'Researcher and clinician specializing in the cognitive and neural mechanisms underlying psychosis, and the development of psychosocial treatments to support recovery.',
    bio: `Dr. Mahesh Menon is a Clinical Associate Professor in the Department of Psychiatry at the University of British Columbia, where his work focuses on the cognitive and neural bases of psychosis. His research examines how unusual perceptual and belief-formation processes give rise to psychotic symptoms — including hallucinations and delusions — with the aim of developing more effective psychosocial interventions that can complement or reduce reliance on medication.

He is particularly interested in the role of aberrant salience and predictive processing in the genesis of psychotic experiences, and in translating these theoretical insights into practical treatment tools. Dr. Menon has conducted clinical trials of psychological interventions for psychosis and has published on the mechanisms of change in these treatments. His work speaks to a broader conviction that psychosis is an understandable phenomenon — one that can be engaged with therapeutically, not merely managed pharmacologically.`,
    website: null,
    websiteLabel: null,
    buzzsproutContributor: null,
  },
  {
    slug: 'johannamickelson',
    name: 'Johanna Mickelson',
    matchLastName: 'Mickelson',
    photo: 'https://psychotherapyandappliedpsychology.com/images/mickelson.jpg',
    affiliation: 'University of British Columbia',
    role: 'PhD Student in Counselling Psychology',
    shortTagline: 'Counselling psychology doctoral researcher studying how people move through suicidal crisis — and what internal and interpersonal processes facilitate that transition.',
    bio: `Johanna Mickelson is a PhD student in Counselling Psychology at the University of British Columbia. She completed both her Bachelor's degree in Psychology and her Master's degree in Counselling Psychology at UBC, building a strong foundation in psychological theory, qualitative research, and clinical practice. Her graduate research focuses on suicidal crisis — specifically, on understanding the dynamic processes through which people move from states of intense suicidal distress toward states of relative calm.

Her work draws on qualitative and mixed-methods approaches to capture the lived experience of suicidal crisis from the inside — how people understand what happened, what helped, and what the process felt like as it unfolded. Johanna is interested in how therapists can be more attuned and responsive to these intra-session processes, and her research has implications for clinical assessment, crisis intervention, and the training of counselling professionals.`,
    website: null,
    websiteLabel: null,
    buzzsproutContributor: null,
  },
  {
    slug: 'kenmiller',
    name: 'Dr. Ken Miller',
    matchLastName: 'Ken Miller',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTI1MjUzLCJwdXIiOiJibG9iX2lkIn19--0dff64bda80b2588378525bb5a359b8eb99343d2/320x400.jpeg',
    affiliation: 'University of British Columbia',
    role: 'Associate Professor, Faculty of Education',
    shortTagline: 'Psychologist and former War Child Holland researcher who has spent his career studying the mental health effects of armed conflict, displacement, and humanitarian crisis.',
    bio: `Dr. Ken Miller is an Associate Professor in the Faculty of Education at the University of British Columbia and a widely recognized expert on the psychological impact of war, armed conflict, and forced displacement. He spent many years as a Senior Researcher at War Child Holland, working in conflict zones and post-conflict settings across Africa, Asia, and the Middle East — developing and evaluating mental health interventions for populations affected by political violence and displacement.

His scholarship challenges simplistic trauma frameworks, arguing that daily stressors arising from poverty, social disruption, and loss of community often matter as much as direct war exposure in determining mental health outcomes. Dr. Miller has published extensively on mental health in humanitarian settings and has trained practitioners and researchers in conflict-affected regions around the world. His books, including works on the psychology of war and refugee experience, are widely read by clinicians, policymakers, and humanitarian workers.`,
    website: 'https://ecps.educ.ubc.ca/kenneth-e-miller/',
    websiteLabel: 'ubc.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'johnogrodniczuk',
    name: 'Dr. John Ogrodniczuk',
    matchLastName: 'Ogrodniczuk',
    photo: 'https://psychotherapyandappliedpsychology.com/images/ogrodniczuk.jpg',
    affiliation: 'University of British Columbia',
    role: 'Professor of Psychiatry',
    shortTagline: 'Prolific psychotherapy researcher and founder of HeadsUpGuys.org — a digital mental health platform that has helped hundreds of thousands of men recognize and address depression.',
    bio: `Dr. John Ogrodniczuk is a Professor of Psychiatry at the University of British Columbia and one of Canada's most prolific psychotherapy researchers. Over his career he has published more than 300 scientific papers on psychotherapy process and outcome, personality disorders, group therapy, and men's mental health. He is also the founder of HeadsUpGuys.org — a research-based, publicly accessible digital platform designed to help men recognize, understand, and take action on depression.

HeadsUpGuys has reached hundreds of thousands of men worldwide and has become a model for how evidence-based mental health resources can be made engaging and accessible to populations who typically avoid help-seeking. Dr. Ogrodniczuk's broader research portfolio includes major contributions to understanding group therapy processes, the role of alexithymia in treatment outcome, and the development and evaluation of psychotherapy for personality disorders. He combines rigorous science with a genuine commitment to translating research into real-world impact.`,
    website: 'https://psychiatry.ubc.ca/john-ogrodniczuk/',
    websiteLabel: 'psychiatry.ubc.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'amieorsetti',
    name: 'Amie Orsetti',
    matchLastName: 'Orsetti',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMzNjMxNjI0LCJwdXIiOiJibG9iX2lkIn19--05bb1b8b5ca2446fd131db0293a189f566cc3639/Amie.jpg',
    affiliation: 'University of British Columbia',
    role: 'MA Student in Counselling Psychology',
    shortTagline: 'Graduate researcher at UBC studying emotion regulation, mental health, and well-being in a counselling psychology training context.',
    bio: `Amie Orsetti is a Master of Arts student in Counselling Psychology at the University of British Columbia. She completed her Bachelor of Arts in Psychology (Honours) from Kwantlen Polytechnic University in 2024, where she developed a strong foundation in psychological research and practice. Her graduate training at UBC combines rigorous coursework with supervised clinical experience.

Her research interests center on emotion regulation, mental health, and psychological well-being. Amie brings an evidence-informed and client-centered perspective to her work and is committed to developing the skills and knowledge to make a meaningful contribution to the field of counselling psychology.`,
    website: null,
    websiteLabel: null,
    buzzsproutContributor: null,
  },
  {
    slug: 'jesseowen',
    name: 'Dr. Jesse Owen',
    matchLastName: 'Jesse Owen',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTI0NDI5LCJwdXIiOiJibG9iX2lkIn19--e940eb20f4d64a6c8ea1ae4a23de9b95c363385b/jesse1-scaled-e1585251628932-1024x576.webp',
    affiliation: 'University of Denver',
    role: 'Professor of Counseling Psychology',
    shortTagline: 'Multicultural orientation researcher and couples therapist whose work demonstrates that how therapists engage with cultural identity matters as much as what they do technically.',
    bio: `Dr. Jesse Owen is a Professor of Counseling Psychology at the University of Denver. His research focuses on psychotherapy processes and outcomes, with particular emphasis on multicultural issues in therapy and the Multicultural Orientation (MCO) framework — an approach that emphasizes therapist cultural humility, genuine curiosity about clients' cultural identities, and explicit attentiveness to how cultural factors shape the therapeutic relationship and its outcomes.

Dr. Owen's empirical work on MCO has been groundbreaking, demonstrating that therapists who approach cultural conversations with greater humility and openness produce meaningfully better outcomes for racially and ethnically diverse clients — findings that have reshaped training curricula across the country. He is also a prolific couples therapy researcher, with studies examining relationship satisfaction, commitment, and the mechanisms of change in couples treatment. A Fellow of the American Psychological Association, he has published more than 100 peer-reviewed articles and trained clinicians nationally in culturally responsive practice.`,
    website: 'https://morgridge.du.edu/about/faculty-directory/jesse-j-owen',
    websiteLabel: 'du.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'antoniopascualone',
    name: 'Dr. Antonio Pascual-Leone',
    matchLastName: 'Pascual-Leone',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMxMDMzMDE5LCJwdXIiOiJibG9iX2lkIn19--ac909ade0904b588014d9ecc7ef09046b164f7ec/OIP.jpeg',
    affiliation: 'University of Windsor',
    role: 'Professor of Clinical Psychology',
    shortTagline: 'Expert in emotion-focused therapy and emotional processing, studying how deep emotional transformation actually happens — and how therapists can facilitate it.',
    bio: `Dr. Antonio Pascual-Leone is a Professor of Clinical Psychology at the University of Windsor, where his research focuses on emotional change processes in psychotherapy. His work examines how people engage with, process, and ultimately resolve difficult emotional experiences during treatment — particularly within emotion-focused therapy (EFT). He has developed influential models of emotional processing that explain what happens at the level of in-session experience when clients undergo meaningful change.

Dr. Pascual-Leone bridges experimental and clinical methods with unusual skill, combining task-analytic and process-outcome approaches to map the steps through which distressing emotional experiences transform into resolution and growth. He has published extensively on the mechanisms of change in EFT and other experiential approaches, trained clinicians and researchers internationally, and received funding from national granting agencies for his work. His research offers therapists a research-grounded roadmap for facilitating the emotional depth that leads to lasting change.`,
    website: 'https://www.uwindsor.ca/people/apl/',
    websiteLabel: 'uwindsor.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'delroypaulhus',
    name: 'Dr. Delroy L. Paulhus',
    matchLastName: 'Paulhus',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQ5ODk3MDY2LCJwdXIiOiJibG9iX2lkIn19--8a238ad65b21dc0a6f7327cf963a743165eee6dd/cropped-cropped-paulhus_Psych_Web.jpg',
    affiliation: 'University of British Columbia',
    role: 'Professor Emeritus of Psychology',
    shortTagline: 'Creator of the Short Dark Triad (SD3) — the world\'s most widely used measure of narcissism, Machiavellianism, and psychopathy in everyday populations.',
    bio: `Dr. Delroy L. Paulhus is a Professor Emeritus of Psychology at the University of British Columbia whose career spans more than four decades of influential work in personality psychology. He is best known as the co-creator of the Short Dark Triad (SD3), which has become the most widely administered measure of subclinical narcissism, Machiavellianism, and psychopathy in normal (non-clinical) populations — fueling a massive global literature on the dark side of personality across psychology, management, criminology, and beyond.

He also developed the Balanced Inventory of Desirable Responding (BIDR), a foundational measure of self-enhancement and socially desirable responding. Over his career Dr. Paulhus has published more than 150 articles and book chapters, accumulating more than 58,000 Google Scholar citations. He has been a rigorous critic of inflated personality measures and a tireless advocate for precision in psychological assessment. His influence on how the field conceptualizes and measures both the dark and the self-deceptive dimensions of human personality is difficult to overstate.`,
    website: 'https://psych.ubc.ca/profile/del-paulhus/',
    websiteLabel: 'psych.ubc.ca',
    buzzsproutContributor: null,
  },
  {
    slug: 'simonrice',
    name: 'Dr. Simon Rice',
    matchLastName: 'Simon Rice',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQ1MTE4NDc3LCJwdXIiOiJibG9iX2lkIn19--73136d1fbe1a07f811f9a57bac58ee83734fb3fe/RICE-SIMON-e1643303758375.png',
    affiliation: 'University of Melbourne',
    role: 'Associate Professor of Psychology',
    shortTagline: 'Men\'s mental health researcher and Global Director of the Movember Men\'s Health Institute, studying depression, masculinity, and suicide prevention in young men.',
    bio: `Dr. Simon Rice is an Associate Professor of Psychology at the University of Melbourne and Global Director of the Movember Men's Health Institute — one of the world's most prominent platforms for men's health research and advocacy. His research focuses on the mental health of men and young people, with particular interests in male-type depression, the way masculinity norms shape men's experiences of distress and their willingness to seek help, and effective suicide prevention approaches for young men.

Dr. Rice has contributed to expanding the conceptual vocabulary for male depression, arguing that many men experience and express depressive symptoms in ways that traditional diagnostic criteria fail to capture — including through externalizing behaviors, irritability, and risk-taking rather than classic sad mood. His work informs how clinicians should approach mental health conversations with male clients, and how population-level campaigns can better engage men. He has published widely and has been a prominent voice in both scientific and public discourse on men's mental health.`,
    website: 'https://findanexpert.unimelb.edu.au/profile/602442-simon-rice',
    websiteLabel: 'unimelb.edu.au',
    buzzsproutContributor: null,
  },
  {
    slug: 'tonyrousmaniere',
    name: 'Dr. Tony Rousmaniere',
    matchLastName: 'Rousmaniere',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQ5MTY2OTE4LCJwdXIiOiJibG9iX2lkIn19--6f7463993f96b55c660756b37657579ab10adeb8/Tony-Rousmaniere.png',
    affiliation: 'Sentio University',
    role: 'President & Clinical Psychologist',
    shortTagline: 'Clinical psychologist and leading voice in deliberate practice for therapists — helping clinicians develop genuine expertise through systematic, effortful skill refinement.',
    bio: `Dr. Tony Rousmaniere is a clinical psychologist, Fellow of the American Psychological Association, and President of Sentio University. He is the foremost popularizer of deliberate practice as a framework for therapist development — arguing, with compelling evidence, that therapy outcomes do not improve with experience alone and that clinicians who want to grow must engage in structured, effortful practice that targets specific skill deficits.

His books on deliberate practice have reached a broad international audience of therapists, supervisors, and trainers, and he has developed training models and platforms that make these ideas accessible in real clinical settings. Dr. Rousmaniere has collaborated with researchers around the world on studies of therapist expertise, outcome monitoring, and training effectiveness. His work, alongside that of colleagues like Dr. Alexandre Vaz, has catalyzed a movement toward more rigorous, outcome-informed approaches to professional development in psychotherapy.`,
    website: 'https://drtonyr.com/',
    websiteLabel: 'drtonyr.com',
    buzzsproutContributor: null,
  },
  {
    slug: 'williamstiles',
    name: 'Dr. William (Bill) Stiles',
    matchLastName: 'Stiles',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTQwMzg3NjgxLCJwdXIiOiJibG9iX2lkIn19--bb8737d1b24d9c7f8187609fe10361a4b5ee0095/Bill_Jan_2009%20copy%202.jpeg',
    affiliation: 'Miami University',
    role: 'Professor Emeritus of Psychology',
    shortTagline: 'Psychotherapy researcher and theorist who developed the Assimilation Model and Responsiveness framework — illuminating how therapists adapt to clients and how clients integrate new understandings.',
    bio: `Dr. William (Bill) Stiles is a Professor Emeritus at Miami University and one of the most prolific and influential psychotherapy researchers of his generation. He is past president of both the APA Society for Psychotherapy and the Society for Psychotherapy Research, and has been recognized as one of the fifty highest-impact authors in psychology. His theoretical contributions include the Assimilation Model — a framework describing how clients gradually integrate problematic experiences into their sense of self — and foundational work on responsive psychotherapy.

His concept of responsiveness — the idea that good therapists continuously tailor their behavior to the client's moment-to-moment state — has been enormously influential in how the field thinks about treatment flexibility and fidelity. Dr. Stiles has also contributed extensively to the study of the therapeutic alliance, session-level processes, and the relationship between research and practice. He approaches psychotherapy theory with unusual rigor, intellectual generosity, and a genuine appreciation for the complexity of human change.`,
    website: 'https://wbstiles.net/',
    websiteLabel: 'wbstiles.net',
    buzzsproutContributor: null,
  },
  {
    slug: 'terrytracey',
    name: 'Dr. Terry Tracey',
    matchLastName: 'Tracey',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTI0MTc4LCJwdXIiOiJibG9iX2lkIn19--45fc5f46a2622e5544e5c3f1f316a74b7c1ac7b6/OIP.jpeg',
    affiliation: 'Arizona State University',
    role: 'Professor Emeritus of Psychology',
    shortTagline: 'Counseling psychologist who transformed understanding of therapeutic interaction, interpersonal personality models, and the surprising predictive power of vocational interests.',
    bio: `Dr. Terry Tracey is a Professor Emeritus of Psychology at Arizona State University and a former editor-in-chief of the Journal of Counseling Psychology. His career has produced influential contributions across multiple areas of counseling and clinical psychology — including the dynamics of client-therapist interaction, the use of interpersonal circumplex models to understand therapeutic processes, and the science of vocational interests and their long-term predictive validity.

His work on therapeutic interaction used rigorous quantitative methods to map how therapist and client influence each other over the course of sessions, offering a more precise empirical picture of what happens relationally in psychotherapy than previously available. His research on vocational interests challenged assumptions about their stability and predictive power, showing that interests measured in adolescence and young adulthood predict important life outcomes far into the future. Dr. Tracey has received multiple lifetime achievement honors and has mentored generations of researchers across the field.`,
    website: 'https://search.asu.edu/profile/229363',
    websiteLabel: 'asu.edu',
    buzzsproutContributor: null,
  },
  {
    slug: 'alexandrevaz',
    name: 'Dr. Alexandre Vaz',
    matchLastName: 'Vaz',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTUzNDUyODU5LCJwdXIiOiJibG9iX2lkIn19--603852fce73166aa1fdec4e3982c7f2b1fd3d9cc/Alex.jpeg',
    affiliation: 'Sentio University',
    role: 'Chief Academic Officer & Clinical Psychologist',
    shortTagline: 'Clinical psychologist and co-founder of the deliberate practice movement in psychotherapy training — helping therapists build expertise through structured, effortful skill development.',
    bio: `Dr. Alexandre Vaz is a clinical psychologist and Chief Academic Officer at Sentio University. He co-founded the Deliberate Practice Institute and has emerged as one of the leading voices in applying deliberate practice principles to psychotherapist training and professional development. His approach draws on the science of expertise to argue that becoming a genuinely effective therapist requires more than accumulated experience — it demands structured, targeted, emotionally demanding practice that pushes clinicians beyond their comfort zones.

Dr. Vaz has authored and co-edited multiple books on psychotherapy training and deliberate practice, and has trained therapists internationally across a variety of theoretical orientations. His YouTube channel, Psychotherapy Expert Talks, has brought these ideas to a broad clinical audience. He and Tony Rousmaniere have been key figures in a broader movement to make psychotherapy training more rigorous, outcome-focused, and aligned with what the science of expertise reveals about how genuine mastery develops.`,
    website: 'https://www.youtube.com/@psychotherapyexperttalks4832',
    websiteLabel: 'YouTube',
    buzzsproutContributor: null,
  },
  {
    slug: 'jamesboswell',
    name: 'Dr. James Boswell',
    matchLastName: 'Boswell',
    photo: 'https://www.buzzsprout.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTMwOTM4MDg4LCJwdXIiOiJibG9iX2lkIn19--bc8d030dcecc10d2d36cf84d0710730939c405d0/download%20(1).jpeg',
    affiliation: 'University at Albany, SUNY',
    role: 'Associate Professor of Psychology',
    shortTagline: 'Psychotherapy researcher focused on how therapists can personalize evidence-based treatments — adapting flexibly to individual clients without sacrificing rigor or outcomes.',
    bio: `Dr. James Boswell is an Associate Professor of Psychology at the University at Albany (SUNY). His research program sits at the intersection of psychotherapy process and outcome, focusing on how therapists can adapt and individualize evidence-based treatments in ways that improve outcomes rather than compromise fidelity. He is particularly interested in therapist competence, training, and the integration of routine outcome monitoring and feedback into clinical practice.

Dr. Boswell has conducted large-scale psychotherapy process studies and contributed to the development of frameworks for training therapists to be more flexible and patient-responsive — especially within cognitive-behavioral and transdiagnostic treatment approaches. He has published extensively in leading psychotherapy journals and is committed to helping clinicians apply research findings in real-world settings. His work bridges common factors and specific treatment models, asking how both sets of variables interact to produce the outcomes that matter most to clients.`,
    website: 'https://www.albany.edu/psychology/faculty/james-boswell',
    websiteLabel: 'albany.edu',
    buzzsproutContributor: null,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (err) { reject(err); }
      });
    }).on('error', reject);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJson(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function matchEpisodes(allEpisodes, guest) {
  return allEpisodes
    .filter(ep => ep.title && ep.title.toLowerCase().includes(guest.matchLastName.toLowerCase()))
    .sort((a, b) => (b.episode_number || 0) - (a.episode_number || 0));
}

function episodeSlugFromAudio(audioUrl) {
  if (!audioUrl) return '';
  return audioUrl.replace('https://www.buzzsprout.com/2324798/episodes/', '').replace('.mp3', '');
}

// ---------------------------------------------------------------------------
// Page template
// ---------------------------------------------------------------------------
function renderPage(guest, episodes) {
  const pageUrl = `${SITE_BASE}/guests/${guest.slug}.html`;
  const title = `${guest.name} | Psychotherapy and Applied Psychology`;
  const metaDescription = `${guest.name} — ${guest.role}, ${guest.affiliation}. ${guest.shortTagline} Featured on Psychotherapy and Applied Psychology podcast.`;

  const bioParagraphs = guest.bio.split(/\n\n+/).map(p => `        <p>${escapeHtml(p.trim())}</p>`).join('\n');

  const episodeCards = episodes.map(ep => {
    const slug = episodeSlugFromAudio(ep.audio_url) || String(ep.id);
    const artwork = ep.artwork_url || `${SITE_BASE}/logo.png`;
    const epNum = ep.episode_number ? `Episode ${ep.episode_number}` : 'Episode';
    const date = ep.published_at ? formatDate(ep.published_at) : '';
    const duration = formatDuration(ep.duration);
    const desc = (ep.description || '').replace(/<[^>]+>/g, '').slice(0, 200).trim();
    return `          <a href="/ep/${slug}.html" class="gst-ep-card">
            <img src="${artwork}" alt="${escapeHtml(ep.title)}" loading="lazy">
            <div class="gst-ep-body">
              <div class="gst-ep-label">${epNum}${date ? ` · ${date}` : ''}${duration ? ` · ${duration}` : ''}</div>
              <h3 class="gst-ep-title">${escapeHtml(ep.title)}</h3>
              ${desc ? `<p class="gst-ep-desc">${escapeHtml(desc)}…</p>` : ''}
            </div>
          </a>`;
  }).join('\n');

  const jsonLdPerson = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: guest.name.replace(/^Dr\.\s*/, ''),
    honorificPrefix: guest.name.startsWith('Dr.') ? 'Dr.' : undefined,
    image: guest.photo,
    jobTitle: guest.role,
    affiliation: { '@type': 'Organization', name: guest.affiliation },
    url: pageUrl,
    sameAs: [guest.website, guest.buzzsproutContributor].filter(Boolean),
    description: guest.shortTagline,
    subjectOf: episodes.map(ep => ({
      '@type': 'PodcastEpisode',
      name: ep.title,
      url: `${SITE_BASE}/ep/${episodeSlugFromAudio(ep.audio_url) || ep.id}.html`,
      datePublished: (ep.published_at || '').slice(0, 10),
    })),
  };
  // strip undefined
  Object.keys(jsonLdPerson).forEach(k => jsonLdPerson[k] === undefined && delete jsonLdPerson[k]);

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Guests', item: `${SITE_BASE}/guests.html` },
      { '@type': 'ListItem', position: 3, name: guest.name, item: pageUrl },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-T91TB00ERC"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-T91TB00ERC');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <meta name="theme-color" content="#1a1a1a">

  <title>${escapeHtml(title)}</title>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">

  <!-- Stylesheets -->
  <link rel="stylesheet" href="../style.css">

  <!-- Favicon -->
  <link rel="icon" href="../logo.png" type="image/png">
  <link rel="apple-touch-icon" href="../logo.png">
  <link rel="alternate" type="application/rss+xml" title="Psychotherapy and Applied Psychology" href="https://rss.buzzsprout.com/2324798.rss">

  <!-- SEO: Canonical -->
  <link rel="canonical" href="${pageUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="Psychotherapy and Applied Psychology">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:image" content="${guest.photo}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
  <meta name="twitter:image" content="${guest.photo}">

  <!-- Schema.org: Person + BreadcrumbList -->
  <script type="application/ld+json">
${JSON.stringify(jsonLdPerson, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(jsonLdBreadcrumb, null, 2)}
  </script>

  <style>
    /* Guest profile page styles */
    .gst-hero {
      background: linear-gradient(135deg, #1a1a1a 0%, var(--accent) 100%);
      color: #fff;
      padding: var(--spacing-2xl) 0;
    }
    .gst-hero-layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: var(--spacing-xl);
      align-items: center;
    }
    .gst-hero-photo {
      width: 220px;
      height: 220px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid rgba(255,255,255,0.25);
      box-shadow: var(--shadow-lg);
      background: #fff;
    }
    .gst-hero h1 {
      color: #fff;
      margin-bottom: var(--spacing-xs);
      font-size: 2.5rem;
    }
    .gst-hero-role {
      color: rgba(255,255,255,0.95);
      font-size: 1.05rem;
      margin-bottom: var(--spacing-xs);
    }
    .gst-hero-affiliation {
      color: rgba(255,255,255,0.8);
      font-size: 0.95rem;
      margin-bottom: var(--spacing-md);
      font-style: italic;
    }
    .gst-hero-tagline {
      color: rgba(255,255,255,0.9);
      font-size: 1rem;
      line-height: 1.6;
      max-width: 640px;
      margin-bottom: var(--spacing-md);
    }
    .gst-hero-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
    }
    .gst-hero-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.15);
      color: #fff;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.2s;
      border: 1px solid rgba(255,255,255,0.25);
    }
    .gst-hero-link:hover {
      background: rgba(255,255,255,0.28);
      color: #fff;
    }
    .gst-breadcrumb {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.75);
      margin-bottom: var(--spacing-md);
    }
    .gst-breadcrumb a { color: rgba(255,255,255,0.85); text-decoration: none; }
    .gst-breadcrumb a:hover { color: #fff; text-decoration: underline; }
    .gst-breadcrumb-sep { margin: 0 6px; }

    /* Bio */
    .gst-bio-section {
      padding: var(--spacing-xl) 0;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .gst-bio-section h2 {
      font-size: 1.5rem;
      margin-bottom: var(--spacing-md);
      color: var(--primary-dark);
    }
    .gst-bio-section p {
      color: var(--text-primary);
      font-size: 1.02rem;
      line-height: 1.75;
      margin-bottom: var(--spacing-sm);
      max-width: 780px;
    }

    /* Episodes */
    .gst-episodes-section { padding: var(--spacing-xl) 0; }
    .gst-episodes-section h2 {
      font-size: 1.5rem;
      margin-bottom: var(--spacing-lg);
      color: var(--primary-dark);
    }
    .gst-episodes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--spacing-lg);
    }
    .gst-ep-card {
      display: block;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      transition: var(--transition);
      box-shadow: var(--shadow-sm);
    }
    .gst-ep-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      color: inherit;
      text-decoration: none;
    }
    .gst-ep-card img {
      width: 100%;
      aspect-ratio: 1/1;
      object-fit: cover;
      display: block;
    }
    .gst-ep-body { padding: var(--spacing-md); }
    .gst-ep-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }
    .gst-ep-title {
      font-size: 1.05rem;
      line-height: 1.4;
      margin-bottom: var(--spacing-xs);
      color: var(--primary-dark);
    }
    .gst-ep-desc {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.55;
    }

    /* Back link */
    .gst-back-link {
      display: inline-block;
      margin-top: var(--spacing-lg);
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    .gst-back-link:hover { color: var(--accent); }

    @media (max-width: 700px) {
      .gst-hero-layout { grid-template-columns: 1fr; text-align: center; }
      .gst-hero-photo { margin: 0 auto; width: 180px; height: 180px; }
      .gst-hero-links { justify-content: center; }
      .gst-hero h1 { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <!-- Header & Navigation -->
  <header>
    <div class="container">
      <a href="../index.html" class="logo">
        <img src="../logo.webp" alt="Podcast Logo">
        <span>Psychotherapy &amp; Applied Psychology</span>
      </a>
      <button class="menu-toggle" aria-label="Toggle navigation" aria-expanded="false">
        <span class="hamburger-icon">☰</span>
      </button>
      <nav>
        <a href="../index.html">Home</a>
        <a href="../episodes.html">Episodes</a>
        <a href="../guests.html">Guests</a>
        <a href="../about.html">About</a>
        <a href="../contact.html">Contact</a>
        <a href="../faq.html">FAQ</a>
      </nav>
    </div>
  </header>

  <!-- Hero -->
  <section class="gst-hero">
    <div class="container">
      <nav class="gst-breadcrumb" aria-label="breadcrumb">
        <a href="../index.html">Home</a>
        <span class="gst-breadcrumb-sep">›</span>
        <a href="../guests.html">Guests</a>
        <span class="gst-breadcrumb-sep">›</span>
        <span>${escapeHtml(guest.name)}</span>
      </nav>

      <div class="gst-hero-layout">
        <img class="gst-hero-photo" src="${guest.photo}" alt="${escapeHtml(guest.name)}">
        <div>
          <h1>${escapeHtml(guest.name)}</h1>
          <div class="gst-hero-role">${escapeHtml(guest.role)}</div>
          <div class="gst-hero-affiliation">${escapeHtml(guest.affiliation)}</div>
          <p class="gst-hero-tagline">${escapeHtml(guest.shortTagline)}</p>
          <div class="gst-hero-links">
            ${guest.website ? `<a class="gst-hero-link" href="${guest.website}" target="_blank" rel="noopener">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              ${escapeHtml(guest.websiteLabel || 'Website')}
            </a>` : ''}
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Bio -->
  <section class="gst-bio-section">
    <div class="container">
      <h2>About ${escapeHtml(guest.name)}</h2>
${bioParagraphs}
    </div>
  </section>

  <!-- Episodes -->
  <section class="gst-episodes-section" id="episodes">
    <div class="container">
      <h2>${episodes.length === 1 ? 'Featured Episode' : 'Featured Episodes'}</h2>
      <div class="gst-episodes-grid">
${episodeCards || '        <p>Episodes coming soon.</p>'}
      </div>
      <a href="../guests.html" class="gst-back-link">← All Guests</a>
    </div>
  </section>

  <!-- Footer -->
  <footer></footer>

  <!-- Scripts -->
  <script src="../shared.js"></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Fetching episodes from Buzzsprout API…');
  const url = `https://www.buzzsprout.com/api/${BUZZSPROUT_FEED_ID}/episodes.json?api_token=${BUZZSPROUT_API_TOKEN}`;
  const allEpisodes = await fetchJson(url);
  console.log(`  Loaded ${allEpisodes.length} episodes.\n`);

  const outDir = path.join(__dirname, 'guests');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const guest of GUESTS) {
    const matched = matchEpisodes(allEpisodes, guest);
    console.log(`  ${guest.name.padEnd(35)} — ${matched.length} episode(s) matched`);
    const html = renderPage(guest, matched);
    const outPath = path.join(outDir, `${guest.slug}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
  }

  console.log(`\nDone. ${GUESTS.length} guest page(s) written to ${outDir}/`);
}

main().catch(err => { console.error(err); process.exit(1); });
