import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import * as bcrypt from "bcrypt";
import { BadRequestError, UnauthorizedError, NotFoundError } from "errors/http.error";
import { User } from "users/users.validation";

// Mock the AuthRepository
jest.mock("./auth.repository");

// Mock the bcrypt module
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

describe("AuthService", () => {
  let authService: AuthService;
  let mockAuthRepository: jest.Mocked<AuthRepository>;

  const mockUser: User = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    password: "hashedPassword",
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a new instance of AuthRepository with mocked methods
    mockAuthRepository = new AuthRepository() as jest.Mocked<AuthRepository>;
    authService = new AuthService(mockAuthRepository);
  });

  describe("user registration", () => {
    it("should successfully register a new user", async () => {
      // Mock repository methods
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockAuthRepository.createUser.mockResolvedValue(mockUser);
      // Mock the bcrypt.hash method
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockUser.password);

      const result = await authService.registerUser({
        username: "testuser",
        email: "test@example.com",
        password: "password123"
      });

      const { password: _password, ...userWithoutPassword } = mockUser;
      expect(result).toMatchObject(userWithoutPassword);
    });

    it("should throw an error if email already exists", async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.registerUser({
          username: "testuser",
          email: "test@example.com",
          password: "password123"
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("user login", () => {
    it("should successfully login a user", async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: "test@example.com",
        password: "password123"
      });

      const { password: _password, ...userWithoutPassword } = mockUser;
      expect(result).toMatchObject(userWithoutPassword);
    });

    it("should throw an error if the user does not exist", async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: "doesnotexist@example.com",
          password: "password123"
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw an error for invalid credentials", async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "wrongpassword"
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("check if user is logged in", () => {
    it("should return user data if logged in", async () => {
      mockAuthRepository.findUserById.mockResolvedValue(mockUser);

      const result = await authService.isLoggedIn(1);

      const { password: _password, ...userWithoutPassword } = mockUser;
      expect(result).toMatchObject(userWithoutPassword);
    });

    it("should throw an error if no userId provided", async () => {
      await expect(authService.isLoggedIn(undefined)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw an error if user not found", async () => {
      mockAuthRepository.findUserById.mockResolvedValue(null);
      await expect(authService.isLoggedIn(2)).rejects.toThrow(NotFoundError);
    });
  });
});
