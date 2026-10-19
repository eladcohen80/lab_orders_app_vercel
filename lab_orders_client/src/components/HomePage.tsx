import homeImage from '../assets/home-lab.png';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-intro">
        <h1>Welcome to the Lab Orders Management System</h1>
        <p>Use the navigation bar to manage orders, suppliers, and products.</p>
      </div>
      <img src={homeImage} alt="Laboratory equipment" className="home-image" />
    </div>
  );
}
