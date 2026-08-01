import React from 'react';

const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="spinner-container">
      <div className="spinner-circle"></div>
      <p className="spinner-text">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
