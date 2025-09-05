import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, type DocumentData } from 'firebase/firestore';

type ArticlePayload = {
  title: string;
  content: string;
  authorId: string;
  authorName: string;
};
//dodaje nowy news
export const addNewsArticle = (articleData: ArticlePayload) => {
  const newsColRef = collection(db, 'news');
  return addDoc(newsColRef, {
    ...articleData,
    createdAt: serverTimestamp(),
  });
};

//pobieranie wszystkich news'ów
export const getNewsArticles = async () => {
  const newsColRef = collection(db, 'news');
  const q = query(newsColRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  const articles = querySnapshot.docs.map((doc: DocumentData) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return articles;
};
