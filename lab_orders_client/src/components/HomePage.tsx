import homeImage from '../assets/Picture1.jpg';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <h1>Welcome to the Lab Orders Management System</h1>
      <p>Use the navigation bar to manage orders, suppliers, and products.</p>
      <img src={homeImage} alt="Laboratory equipment" className="home-image" />
    </div>
  );
}
