const string =
  "Quantum mechanics, science dealing with the behaviour of matter and light on the atomic and subatomic scale. It attempts to describe and account for the properties of molecules and atoms and their constituents—electrons, protons, neutrons, and other more esoteric particles such as quarks and gluons. These properties include the interactions of the particles with one another and with electromagnetic radiation (i.e., light, X-rays, and gamma rays). The behaviour of matter and radiation on the atomic scale often seems peculiar, and the consequences of quantum theory are accordingly difficult to understand and to believe. Its concepts frequently conflict with common-sense notions derived from observations of the everyday world. There is no reason, however, why the behaviour of the atomic world should conform to that of the familiar, large-scale world. It is important to realize that quantum mechanics is a branch of physics and that the business of physics is to describe and account for the way the world—on both the large and the small scale—actually is and not how one imagines it or would like it to be. The study of quantum mechanics is rewarding for several reasons. First, it illustrates the essential methodology of physics. Second, it has been enormously successful in giving correct results in practically every situation to which it has been applied. There is, however, an intriguing paradox. In spite of the overwhelming practical success of quantum mechanics, the foundations of the subject contain unresolved problems—in particular, problems concerning the nature of measurement. An essential feature of quantum mechanics is that it is generally impossible, even in principle, to measure a system without disturbing it; the detailed nature of this disturbance and the exact point at which it occurs are obscure and controversial. Thus, quantum mechanics attracted some of the ablest scientists of the 20th century, and they erected what is perhaps the finest intellectual edifice of the period.";

export function generatePlaceholder() {
  const words = string.split(" ");
  const paragraph = [];
  for (let i = 0; i < 10; i++) {
    paragraph.push(words[Math.floor(Math.random() * words.length)]);
  }
  return paragraph.join(" ").toLowerCase();
}

export async function generateParagraph() {
  try {
    const response = await fetch("http://metaphorpsum.com/paragraphs/1");

    if (!response.ok) {
      throw new Error();
    }

    const data = await response.text();
    const paragraph = data.split(`\n`).join(" ");

    return paragraph;
  } catch (error) {
    console.log(error);
    const paragraph = generatePlaceholder();
    return paragraph;
  }
}