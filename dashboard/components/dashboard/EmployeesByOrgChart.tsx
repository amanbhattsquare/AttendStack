"use client";
import { Card } from "react-bootstrap";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface EmployeesByOrgChartProps {
  data: { x: string; y: number }[];
}

const EmployeesByOrgChart = ({ data }: EmployeesByOrgChartProps) => {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: 350,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: data.map((d) => d.x),
    },
    yaxis: {
      title: {
        text: "Number of Employees",
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " employees";
        },
      },
    },
  };

  const series = [
    {
      name: "Employees",
      data: data.map((d) => d.y),
    },
  ];

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Employees by Organization</h5>
      </Card.Header>
      <Card.Body>
        <Chart options={options} series={series} type="bar" height={350} />
      </Card.Body>
    </Card>
  );
};

export default EmployeesByOrgChart;