import os
import unittest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup local imports
import models
import schemas
import crud
from database import Base

class TestScoringEngine(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database for testing
        self.engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()
        
        # Create test users
        self.user_exact = models.User(id="user_exact", email="exact@test.com", display_name="Exact Matcher", points=0)
        self.user_partial = models.User(id="user_partial", email="partial@test.com", display_name="Partial Matcher", points=0)
        self.user_wrong = models.User(id="user_wrong", email="wrong@test.com", display_name="Wrong Matcher", points=0)
        
        self.db.add_all([self.user_exact, self.user_partial, self.user_wrong])
        self.db.commit()

        # Create a test match
        self.match = models.Match(
            id=1,
            home_team="Argentina",
            away_team="Francia",
            match_time=datetime.utcnow(),
            stage="Final",
            status="scheduled"
        )
        self.db.add(self.match)
        self.db.commit()

        # Create predictions for each user on the match:
        # Actual result will be 3 - 2 (Argentina wins)
        
        # User 1: predicts 3 - 2 (Exact score)
        self.pred_exact = models.Prediction(
            user_id="user_exact",
            match_id=1,
            home_prediction=3,
            away_prediction=2
        )
        
        # User 2: predicts 1 - 0 (Correct winner, wrong score)
        self.pred_partial = models.Prediction(
            user_id="user_partial",
            match_id=1,
            home_prediction=1,
            away_prediction=0
        )
        
        # User 3: predicts 1 - 2 (Wrong winner)
        self.pred_wrong = models.Prediction(
            user_id="user_wrong",
            match_id=1,
            home_prediction=1,
            away_prediction=2
        )
        
        self.db.add_all([self.pred_exact, self.pred_partial, self.pred_wrong])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_scoring_rules(self):
        # 1. Update the match results to 3 - 2, finished
        crud.update_match_results(self.db, match_id=1, home_score=3, away_score=2, status="finished")
        
        # Refresh the database records
        pred1 = self.db.query(models.Prediction).filter_by(user_id="user_exact").first()
        pred2 = self.db.query(models.Prediction).filter_by(user_id="user_partial").first()
        pred3 = self.db.query(models.Prediction).filter_by(user_id="user_wrong").first()
        
        user1 = crud.get_user(self.db, "user_exact")
        user2 = crud.get_user(self.db, "user_partial")
        user3 = crud.get_user(self.db, "user_wrong")

        # 2. Assert prediction point values
        self.assertEqual(pred1.points_earned, 3, "Exact score should earn 3 points")
        self.assertEqual(pred2.points_earned, 1, "Correct outcome should earn 1 point")
        self.assertEqual(pred3.points_earned, 0, "Incorrect outcome should earn 0 points")

        # 3. Assert user total points are updated
        self.assertEqual(user1.points, 3, "User with exact score should have 3 points total")
        self.assertEqual(user2.points, 1, "User with correct winner should have 1 point total")
        self.assertEqual(user3.points, 0, "User with wrong prediction should have 0 points total")

if __name__ == "__main__":
    unittest.main()
