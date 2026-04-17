import{BrowserRouter,Routes,Route}from'react-router-dom';
import Layout from'./components/Layout';
import HomePage from'./pages/HomePage';
import LearnPage from'./pages/LearnPage';
import LeaderPage from'./pages/LeaderPage';
import LeaderCreatePage from'./pages/LeaderCreatePage';
import PlayerPage from'./pages/PlayerPage';
import PlayPage from'./pages/PlayPage';
import QuizPage from'./pages/QuizPage';
import ResultPage from'./pages/ResultPage';

function App(){
  return(<BrowserRouter><Layout><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/learn" element={<LearnPage/>}/>
    <Route path="/leader" element={<LeaderPage/>}/>
    <Route path="/leader/create" element={<LeaderCreatePage/>}/>
    <Route path="/player" element={<PlayerPage/>}/>
    <Route path="/play/:gameId" element={<PlayPage/>}/>
    <Route path="/quiz" element={<QuizPage/>}/>
    <Route path="/result" element={<ResultPage/>}/>
  </Routes></Layout></BrowserRouter>);
}
export default App;
